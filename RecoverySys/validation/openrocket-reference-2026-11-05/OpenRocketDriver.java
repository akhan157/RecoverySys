import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonReader;
import net.sf.openrocket.startup.Application;
import net.sf.openrocket.startup.GuiModule;
import net.sf.openrocket.plugin.PluginModule;
import com.google.inject.Guice;
import com.google.inject.Injector;
import net.sf.openrocket.document.Simulation;
import net.sf.openrocket.rocketcomponent.*;
import net.sf.openrocket.rocketcomponent.position.AxialMethod;
import net.sf.openrocket.motor.*;
import net.sf.openrocket.file.motor.RASPMotorLoader;
import net.sf.openrocket.simulation.*;
import net.sf.openrocket.simulation.listeners.AbstractSimulationListener;
import net.sf.openrocket.util.Coordinate;

/**
 * Headless OpenRocket 23.09 Execution Driver (Corrected).
 *
 * Fully parses the shared reference-vehicle.json manifest via bundled javax.json,
 * configures the exact physical fixture without bypassing parameters, extracts
 * real trajectory events and observed masses, and outputs comprehensive properties
 * distinguishing nominal inputs from observed events and phase durations.
 */
public class OpenRocketDriver {

    private static String sha256(Path file) throws Exception {
        return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));
    }

    public static class MatchedEnvironmentListener extends AbstractSimulationListener {
        private final double gravity;

        public MatchedEnvironmentListener(double gravity) {
            this.gravity = gravity;
        }

        @Override
        public double preGravityModel(SimulationStatus status) {
            return gravity;
        }

        @Override
        public Coordinate preWindModel(SimulationStatus status) {
            return Coordinate.ZERO;
        }
    }

    public static void main(String[] args) {
        // Quiet high-frequency simulation listener INFO logging
        try {
            org.slf4j.Logger slf4jRoot = org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
            if (slf4jRoot instanceof ch.qos.logback.classic.Logger) {
                ((ch.qos.logback.classic.Logger) slf4jRoot).setLevel(ch.qos.logback.classic.Level.WARN);
            }
        } catch (Throwable ignored) {}

        String artifactsDir = "../RecoverySys-artifacts/online-validation-2026-11-05/openrocket";
        String manifestPath = "reference-vehicle.json";
        String motorPathStr = null;
        String mode = "controlled_cd"; // "controlled_cd" or "native_aero"
        String outputPrefix = "or-reference-controlled-cd";
        String runId = UUID.randomUUID().toString();

        for (int i = 0; i < args.length; i++) {
            if ("--artifacts-dir".equals(args[i]) && i + 1 < args.length) {
                artifactsDir = args[++i];
            } else if ("--manifest".equals(args[i]) && i + 1 < args.length) {
                manifestPath = args[++i];
            } else if ("--motor".equals(args[i]) && i + 1 < args.length) {
                motorPathStr = args[++i];
            } else if ("--mode".equals(args[i]) && i + 1 < args.length) {
                mode = args[++i];
            } else if ("--output-prefix".equals(args[i]) && i + 1 < args.length) {
                outputPrefix = args[++i];
            } else if ("--run-id".equals(args[i]) && i + 1 < args.length) {
                runId = args[++i];
            }
        }

        if (!mode.equals("controlled_cd") && !mode.equals("native_aero")) {
            System.err.println("ERROR: Unsupported simulation mode"); System.exit(2);
        }
        Path artifactsPath = Paths.get(artifactsDir).toAbsolutePath().normalize();
        Path manifestFile = Paths.get(manifestPath).toAbsolutePath().normalize();

        System.out.println("==================================================================");
        System.out.println("OpenRocket 23.09 Headless Reference Driver (Corrected)");
        System.out.println("Manifest:       " + manifestFile);
        System.out.println("Artifacts Dir:  " + artifactsPath);
        System.out.println("Mode:           " + mode);
        System.out.println("Output Prefix:  " + outputPrefix);
        System.out.println("==================================================================");

        if (!Files.exists(manifestFile)) {
            System.err.println("ERROR: Manifest file not found at " + manifestFile);
            System.exit(2);
        }

        // 1. Parse and Validate Shared Manifest via bundled javax.json
        JsonObject manifest;
        try (InputStream is = Files.newInputStream(manifestFile);
             JsonReader reader = Json.createReader(is)) {
            manifest = reader.readObject();
        } catch (Exception e) {
            System.err.println("ERROR: Failed to parse manifest JSON: " + e.getMessage());
            e.printStackTrace();
            System.exit(2);
            return;
        }

        // Extract and validate sections
        JsonObject geom = manifest.getJsonObject("geometry");
        JsonObject massObj = manifest.getJsonObject("mass");
        JsonObject aeroObj = manifest.getJsonObject("aerodynamics");
        JsonObject motorObj = manifest.getJsonObject("motor");
        JsonObject recoveryObj = manifest.getJsonObject("recovery");
        JsonObject envObj = manifest.getJsonObject("environment");

        if (geom == null || massObj == null || aeroObj == null || motorObj == null || recoveryObj == null || envObj == null) {
            System.err.println("ERROR: Manifest is missing one or more required top-level sections.");
            System.exit(2);
        }

        // Geometry values
        JsonObject noseObj = geom.getJsonObject("nose_cone");
        double noseLengthM = noseObj.getJsonNumber("length_m").doubleValue();
        double noseRadiusM = noseObj.getJsonNumber("base_radius_m").doubleValue();
        String noseShape = noseObj.getString("shape", "OGIVE");

        JsonObject bodyObj = geom.getJsonObject("body_tube");
        double bodyLengthM = bodyObj.getJsonNumber("length_m").doubleValue();
        double bodyOuterRadiusM = bodyObj.getJsonNumber("outer_radius_m").doubleValue();
        double bodyInnerRadiusM = bodyObj.getJsonNumber("inner_radius_m").doubleValue();

        JsonObject finsObj = geom.getJsonObject("fins");
        int finCount = finsObj.getInt("count", 3);
        double finRootM = finsObj.getJsonNumber("root_chord_m").doubleValue();
        double finTipM = finsObj.getJsonNumber("tip_chord_m").doubleValue();
        double finHeightM = finsObj.getJsonNumber("height_m").doubleValue();
        double finSweepM = finsObj.getJsonNumber("sweep_m").doubleValue();
        double finThicknessM = finsObj.getJsonNumber("thickness_m").doubleValue();

        // Mass values (with strict positive validation)
        double dryMassKg = massObj.getJsonNumber("vehicle_dry_mass_kg").doubleValue();
        double dryCgLocationM = massObj.getJsonNumber("dry_cg_location_m").doubleValue();
        double nominalLaunchMassKg = massObj.getJsonNumber("total_launch_mass_kg").doubleValue();
        double nominalBurnoutMassKg = massObj.getJsonNumber("burned_out_mass_kg").doubleValue();

        if (dryMassKg <= 0.0) {
            System.err.println("ERROR: Invalid vehicle_dry_mass_kg (must be positive): " + dryMassKg);
            System.exit(2);
        }
        if (dryCgLocationM <= 0.0) {
            System.err.println("ERROR: Invalid dry_cg_location_m (must be positive): " + dryCgLocationM);
            System.exit(2);
        }

        // Aerodynamics
        double baselineCd = aeroObj.getJsonNumber("baseline_subsonic_cd").doubleValue();

        // Recovery values
        JsonObject drogueObj = recoveryObj.getJsonObject("drogue");
        double drogueDiamM = drogueObj.getJsonNumber("diameter_m").doubleValue();
        double drogueCd = drogueObj.getJsonNumber("cd").doubleValue();

        JsonObject mainObj = recoveryObj.getJsonObject("main");
        double mainDiamM = mainObj.getJsonNumber("diameter_m").doubleValue();
        double mainCd = mainObj.getJsonNumber("cd").doubleValue();
        double mainDeployAltM = mainObj.getJsonNumber("deploy_altitude_m").doubleValue();

        // Environment values
        double standardGravity = envObj.containsKey("standard_gravity_m_s2")
            ? envObj.getJsonNumber("standard_gravity_m_s2").doubleValue() : 9.80665;
        double launchRodLengthM = envObj.containsKey("launch_rod_length_m")
            ? envObj.getJsonNumber("launch_rod_length_m").doubleValue() : 2.0;
        double launchRodAngleDeg = envObj.containsKey("launch_rod_angle_deg")
            ? envObj.getJsonNumber("launch_rod_angle_deg").doubleValue() : 0.0;
        double timeStepS = envObj.containsKey("simulation_time_step_s")
            ? envObj.getJsonNumber("simulation_time_step_s").doubleValue() : 0.01;

        // Motor resolution
        String motorFileName = motorObj.getString("motor_file", "I200W.eng");
        Path motorPath;
        if (motorPathStr != null) {
            Path explicitMotor = Paths.get(motorPathStr).toAbsolutePath().normalize();
            if (!Files.exists(explicitMotor)) {
                System.err.println("ERROR: Specified motor file not found: " + explicitMotor);
                System.exit(2);
                return;
            }
            motorPath = explicitMotor;
        } else if (Files.exists(artifactsPath.resolve(motorFileName))) {
            motorPath = artifactsPath.resolve(motorFileName);
        } else if (Files.exists(manifestFile.getParent().resolve(motorFileName))) {
            motorPath = manifestFile.getParent().resolve(motorFileName);
        } else {
            System.err.println("ERROR: Motor file not found; supply --motor explicitly.");
            System.exit(2);
            return;
        }

        System.out.println("Resolved Motor File: " + motorPath);

        try {
            // Initialize OpenRocket Guice bindings
            GuiModule guiModule = new GuiModule();
            PluginModule pluginModule = new PluginModule();
            Injector injector = Guice.createInjector(guiModule, pluginModule);
            Application.setInjector(injector);
            guiModule.startLoader();

            // 2. Assemble Rocket according to manifest geometry
            Rocket rocket = new Rocket();
            rocket.setName("RecoverySys-Manifest-Rocket");
            AxialStage stage = new AxialStage();
            stage.setName("Sustainer");
            rocket.addChild(stage);

            // Nose cone
            NoseCone nose = new NoseCone();
            nose.setName("NoseCone");
            nose.setLength(noseLengthM);
            nose.setBaseRadius(noseRadiusM);
            if ("CONICAL".equalsIgnoreCase(noseShape)) {
                nose.setShapeType(Transition.Shape.CONICAL);
            } else {
                nose.setShapeType(Transition.Shape.OGIVE);
            }
            nose.setAxialMethod(AxialMethod.TOP);
            nose.setAxialOffset(0.0);
            stage.addChild(nose);

            // Body tube
            BodyTube body = new BodyTube();
            body.setName("Airframe");
            body.setLength(bodyLengthM);
            body.setOuterRadius(bodyOuterRadiusM);
            body.setInnerRadius(bodyInnerRadiusM);
            body.setMotorMount(true);
            body.setAxialMethod(AxialMethod.TOP);
            body.setAxialOffset(noseLengthM);
            stage.addChild(body);

            // Fins
            TrapezoidFinSet fins = new TrapezoidFinSet();
            fins.setName("Fins");
            fins.setFinCount(finCount);
            fins.setFinShape(finRootM, finTipM, finSweepM, finHeightM, finThicknessM);
            body.addChild(fins);
            fins.setAxialMethod(AxialMethod.TOP);
            fins.setAxialOffset(bodyLengthM - finRootM);

            // Recovery: Drogue parachute (manifest diameter and Cd)
            Parachute drogue = new Parachute();
            drogue.setName("DrogueChute");
            drogue.setDiameter(drogueDiamM);
            drogue.setCDAutomatic(false);
            drogue.setCD(drogueCd);
            body.addChild(drogue);

            // Recovery: Main parachute (manifest diameter and Cd)
            Parachute main = new Parachute();
            main.setName("MainChute");
            main.setDiameter(mainDiamM);
            main.setCDAutomatic(false);
            main.setCD(mainCd);
            body.addChild(main);

            // Flight Configuration & Events
            FlightConfigurationId configId = new FlightConfigurationId();
            rocket.createFlightConfiguration(configId);
            rocket.setSelectedConfiguration(configId);

            DeploymentConfiguration drogueDeploy = new DeploymentConfiguration();
            drogueDeploy.setDeployEvent(DeploymentConfiguration.DeployEvent.APOGEE);
            drogueDeploy.setDeployDelay(0.0);
            drogue.getDeploymentConfigurations().set(configId, drogueDeploy);

            DeploymentConfiguration mainDeploy = new DeploymentConfiguration();
            mainDeploy.setDeployEvent(DeploymentConfiguration.DeployEvent.ALTITUDE);
            mainDeploy.setDeployAltitude(mainDeployAltM);
            mainDeploy.setDeployDelay(0.0);
            main.getDeploymentConfigurations().set(configId, mainDeploy);

            // Motor Configuration
            RASPMotorLoader loader = new RASPMotorLoader();
            ThrustCurveMotor motor;
            try (FileReader reader = new FileReader(motorPath.toFile())) {
                List<ThrustCurveMotor.Builder> builders = loader.load(reader, motorPath.getFileName().toString());
                if (builders.isEmpty()) {
                    throw new IllegalStateException("No motor curves found in " + motorPath);
                }
                motor = builders.get(0).build();
            }

            MotorConfiguration motorConfig = new MotorConfiguration(body, configId);
            motorConfig.setMotor(motor);
            motorConfig.setIgnitionEvent(IgnitionEvent.LAUNCH);
            motorConfig.setIgnitionDelay(0.0);
            motorConfig.setEjectionDelay(Double.POSITIVE_INFINITY); // Electronic deployment
            body.setMotorConfig(motorConfig, configId);

            // Mass Overrides from Manifest
            stage.setOverrideMass(dryMassKg);
            stage.setMassOverridden(true);
            stage.setSubcomponentsOverriddenMass(true);
            stage.setOverrideCGX(dryCgLocationM);
            stage.setCGOverridden(true);
            stage.setSubcomponentsOverriddenCG(true);

            // Aerodynamic CD Override (if controlled_cd mode)
            if ("controlled_cd".equalsIgnoreCase(mode)) {
                stage.setOverrideCD(baselineCd);
                stage.setCDOverridden(true);
                stage.setSubcomponentsOverriddenCD(true);
            }

            // Setup Simulation Options
            Simulation simulation = new Simulation(rocket);
            simulation.setFlightConfigurationId(configId);
            SimulationOptions options = simulation.getOptions();
            options.setLaunchRodLength(launchRodLengthM);
            options.setLaunchRodAngle(launchRodAngleDeg);
            options.setLaunchAltitude(0.0);
            options.setISAAtmosphere(true);
            options.setWindSpeedAverage(0.0);
            options.setTimeStep(timeStepS);

            // Run Simulation with Matched Environment
            System.out.println("Starting OpenRocket simulation integration...");
            simulation.simulate(new MatchedEnvironmentListener(standardGravity));

            FlightData data = simulation.getSimulatedData();
            if (data == null || data.getBranchCount() == 0) {
                System.err.println("ERROR: Simulation produced no flight data branches.");
                System.exit(3);
            }

            FlightDataBranch branch = data.getBranch(0);
            int dataLength = branch.getLength();

            List<Double> timeCol = branch.get(FlightDataType.TYPE_TIME);
            List<Double> altCol = branch.get(FlightDataType.TYPE_ALTITUDE);
            List<Double> vzCol = branch.get(FlightDataType.TYPE_VELOCITY_Z);
            List<Double> azCol = branch.get(FlightDataType.TYPE_ACCELERATION_Z);
            List<Double> machCol = branch.get(FlightDataType.TYPE_MACH_NUMBER);
            List<Double> massCol = branch.get(FlightDataType.TYPE_MASS);
            List<Double> thrustCol = branch.get(FlightDataType.TYPE_THRUST_FORCE);
            List<Double> cdCol = branch.get(FlightDataType.TYPE_DRAG_COEFF);
            List<Double> dragCol = branch.get(FlightDataType.TYPE_DRAG_FORCE);

            // 3. Extract Real Trajectory Events
            FlightEvent burnoutEv = branch.getFirstEvent(FlightEvent.Type.BURNOUT);
            FlightEvent apogeeEv = branch.getFirstEvent(FlightEvent.Type.APOGEE);
            FlightEvent groundHitEv = branch.getFirstEvent(FlightEvent.Type.GROUND_HIT);

            if (burnoutEv == null || apogeeEv == null || groundHitEv == null) {
                throw new IllegalStateException("Missing required burnout/apogee/ground event");
            }
            double observedApogeeM = data.getMaxAltitude();
            double observedApogeeTimeS = apogeeEv.getTime();
            double observedBurnoutTimeS = burnoutEv.getTime();
            double observedLandingTimeS = groundHitEv.getTime();
            double observedTouchdownVelMps = data.getGroundHitVelocity();

            double observedLaunchMassKg = massCol != null && !massCol.isEmpty() ? massCol.get(0) : Double.NaN;
            double observedLandingMassKg = massCol != null && !massCol.isEmpty() ? massCol.get(massCol.size() - 1) : Double.NaN;
            double observedBurnoutMassKg = Double.NaN;
            for (int r = 0; r < dataLength; r++) {
                if (timeCol.get(r) >= observedBurnoutTimeS) {
                    observedBurnoutMassKg = massCol.get(r);
                    break;
                }
            }

            // Identify deployment times and altitudes from events
            double drogueDeployTimeS = -1.0;
            double observedDrogueDeployAltM = -1.0;
            double mainDeployTimeS = -1.0;
            double observedMainDeployAltM = -1.0;

            for (FlightEvent ev : branch.getEvents()) {
                if (ev.getType() == FlightEvent.Type.RECOVERY_DEVICE_DEPLOYMENT) {
                    String srcName = ev.getSource() != null ? ev.getSource().getName() : "";
                    if (srcName.contains("Drogue") || drogueDeployTimeS < 0) {
                        if (drogueDeployTimeS < 0) {
                            drogueDeployTimeS = ev.getTime();
                        }
                    }
                    if (srcName.contains("Main")) {
                        mainDeployTimeS = ev.getTime();
                    }
                }
            }
            if (drogueDeployTimeS < 0 || mainDeployTimeS < 0) throw new IllegalStateException("Missing required recovery deployment event");

            // Find altitudes and velocities at deployment events
            int mainDeployIndex = -1;
            for (int r = 0; r < dataLength; r++) {
                double t = timeCol.get(r);
                if (Math.abs(t - drogueDeployTimeS) < 0.02 && observedDrogueDeployAltM < 0) {
                    observedDrogueDeployAltM = altCol.get(r);
                }
                if (mainDeployTimeS > 0 && Math.abs(t - mainDeployTimeS) < 0.02 && mainDeployIndex < 0) {
                    mainDeployIndex = r;
                    observedMainDeployAltM = altCol.get(r);
                }
            }
            if (observedDrogueDeployAltM < 0 || mainDeployIndex < 2) throw new IllegalStateException("Missing deployment samples");

            // Sampled velocities; not a proof of terminal equilibrium
            double drogueTerminalVelMps = 0.0;
            if (mainDeployIndex > 1 && vzCol != null) {
                drogueTerminalVelMps = Math.abs(vzCol.get(mainDeployIndex - 1));
            }
            double mainTerminalVelMps = observedTouchdownVelMps;
            if (dataLength > 5 && vzCol != null) {
                mainTerminalVelMps = Math.abs(vzCol.get(dataLength - 2));
            }

            // Mean descent rates
            double drogueMeanDescentRateMps = (mainDeployTimeS > drogueDeployTimeS)
                ? (observedDrogueDeployAltM - observedMainDeployAltM) / (mainDeployTimeS - drogueDeployTimeS)
                : 0.0;
            double mainMeanDescentRateMps = (observedLandingTimeS > mainDeployTimeS)
                ? (observedMainDeployAltM - 0.0) / (observedLandingTimeS - mainDeployTimeS)
                : 0.0;

            // Phase and total clocks
            double observedDescentDurationS = observedLandingTimeS - observedApogeeTimeS;
            double observedFlightDurationS = observedLandingTimeS;

            for (double value : new double[]{observedApogeeM, observedApogeeTimeS, observedBurnoutTimeS,
                observedLandingTimeS, observedTouchdownVelMps, observedLaunchMassKg, observedBurnoutMassKg,
                observedLandingMassKg, observedDescentDurationS, drogueTerminalVelMps, mainTerminalVelMps}) {
                if (!Double.isFinite(value) || value <= 0) throw new IllegalStateException("Invalid required observation: " + value);
            }

            // 4. Write Raw Flight Time-Series CSV
            Files.createDirectories(artifactsPath);
            Path csvPath = artifactsPath.resolve(outputPrefix + "-flight-timeseries.csv");
            try (PrintWriter pw = new PrintWriter(Files.newBufferedWriter(csvPath))) {
                pw.println("time_s,altitude_m,velocity_z_m_s,acceleration_z_m_s2,mach,mass_kg,thrust_N,drag_coeff,drag_force_N");
                for (int r = 0; r < dataLength; r++) {
                    pw.printf(Locale.US, "%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f%n",
                        timeCol.get(r),
                        altCol.get(r),
                        vzCol != null ? vzCol.get(r) : 0.0,
                        azCol != null ? azCol.get(r) : 0.0,
                        machCol != null ? machCol.get(r) : 0.0,
                        massCol != null ? massCol.get(r) : 0.0,
                        thrustCol != null ? thrustCol.get(r) : 0.0,
                        cdCol != null ? cdCol.get(r) : 0.0,
                        dragCol != null ? dragCol.get(r) : 0.0
                    );
                }
            }
            System.out.println("Wrote raw flight time-series to: " + csvPath);

            try (PrintWriter pw = new PrintWriter(Files.newBufferedWriter(artifactsPath.resolve(outputPrefix + "-events.csv")))) {
                pw.println("time_s,type,source");
                for (FlightEvent ev : branch.getEvents()) {
                    pw.printf(Locale.US, "%.8f,%s,%s%n", ev.getTime(), ev.getType(),
                        ev.getSource() == null ? "" : ev.getSource().getName().replace(",", " "));
                }
            }

            // 5. Write Comprehensive Summary Properties
            Path summaryPath = artifactsPath.resolve(outputPrefix + "-summary.properties");
            Properties props = new Properties();
            props.setProperty("simulator", "OpenRocket");
            props.setProperty("run_id", runId);
            props.setProperty("manifest_sha256", sha256(manifestFile));
            props.setProperty("motor_sha256", sha256(motorPath));
            props.setProperty("configured_fin_sweep_m", Double.toString(fins.getSweep()));
            props.setProperty("configured_fin_height_m", Double.toString(fins.getHeight()));
            props.setProperty("velocity_definition", "Legacy terminal keys contain pre-main / pre-landing samples; equilibrium not asserted");
            props.setProperty("drogue_sample_time_s", Double.toString(timeCol.get(mainDeployIndex - 1)));
            props.setProperty("drogue_sample_altitude_m", Double.toString(altCol.get(mainDeployIndex - 1)));
            props.setProperty("main_sample_time_s", Double.toString(timeCol.get(dataLength - 2)));
            props.setProperty("main_sample_altitude_m", Double.toString(altCol.get(dataLength - 2)));
            props.setProperty("version", "23.09");
            props.setProperty("git_commit", "6c89a3c60118226e562e19625d8fd439854b1246");
            props.setProperty("mode", mode);

            // Nominal inputs from manifest
            props.setProperty("nominal_vehicle_dry_mass_kg", String.format(Locale.US, "%.6f", dryMassKg));
            props.setProperty("nominal_total_launch_mass_kg", String.format(Locale.US, "%.6f", nominalLaunchMassKg));
            props.setProperty("nominal_burned_out_mass_kg", String.format(Locale.US, "%.6f", nominalBurnoutMassKg));
            props.setProperty("nominal_drogue_diameter_m", String.format(Locale.US, "%.4f", drogueDiamM));
            props.setProperty("nominal_drogue_cd", String.format(Locale.US, "%.4f", drogueCd));
            props.setProperty("nominal_main_diameter_m", String.format(Locale.US, "%.4f", mainDiamM));
            props.setProperty("nominal_main_cd", String.format(Locale.US, "%.4f", mainCd));
            props.setProperty("nominal_main_deploy_alt_m", String.format(Locale.US, "%.4f", mainDeployAltM));

            // Observed Masses
            props.setProperty("observed_launch_mass_kg", String.format(Locale.US, "%.6f", observedLaunchMassKg));
            props.setProperty("observed_burnout_mass_kg", String.format(Locale.US, "%.6f", observedBurnoutMassKg));
            props.setProperty("observed_landing_mass_kg", String.format(Locale.US, "%.6f", observedLandingMassKg));

            // Observed Trajectory & Events
            props.setProperty("observed_apogee_m", String.format(Locale.US, "%.4f", observedApogeeM));
            props.setProperty("observed_apogee_ft", String.format(Locale.US, "%.4f", observedApogeeM * 3.28084));
            props.setProperty("observed_apogee_time_s", String.format(Locale.US, "%.4f", observedApogeeTimeS));
            props.setProperty("observed_burnout_time_s", String.format(Locale.US, "%.4f", observedBurnoutTimeS));
            props.setProperty("observed_landing_time_s", String.format(Locale.US, "%.4f", observedLandingTimeS));
            props.setProperty("observed_max_velocity_m_s", String.format(Locale.US, "%.4f", data.getMaxVelocity()));
            props.setProperty("observed_max_mach", String.format(Locale.US, "%.4f", data.getMaxMachNumber()));

            // Deployment events
            props.setProperty("observed_drogue_deploy_time_s", String.format(Locale.US, "%.4f", drogueDeployTimeS));
            props.setProperty("observed_drogue_deploy_alt_m", String.format(Locale.US, "%.4f", observedDrogueDeployAltM));
            props.setProperty("observed_main_deploy_time_s", String.format(Locale.US, "%.4f", mainDeployTimeS));
            props.setProperty("observed_main_deploy_alt_m", String.format(Locale.US, "%.4f", observedMainDeployAltM));

            // Velocities and Descent Rates
            props.setProperty("observed_drogue_terminal_velocity_m_s", String.format(Locale.US, "%.4f", drogueTerminalVelMps));
            props.setProperty("observed_drogue_terminal_velocity_fps", String.format(Locale.US, "%.4f", drogueTerminalVelMps * 3.28084));
            props.setProperty("observed_drogue_mean_descent_rate_m_s", String.format(Locale.US, "%.4f", drogueMeanDescentRateMps));
            props.setProperty("observed_drogue_mean_descent_rate_fps", String.format(Locale.US, "%.4f", drogueMeanDescentRateMps * 3.28084));
            props.setProperty("observed_main_terminal_velocity_m_s", String.format(Locale.US, "%.4f", mainTerminalVelMps));
            props.setProperty("observed_main_terminal_velocity_fps", String.format(Locale.US, "%.4f", mainTerminalVelMps * 3.28084));
            props.setProperty("observed_main_mean_descent_rate_m_s", String.format(Locale.US, "%.4f", mainMeanDescentRateMps));
            props.setProperty("observed_main_mean_descent_rate_fps", String.format(Locale.US, "%.4f", mainMeanDescentRateMps * 3.28084));
            props.setProperty("observed_touchdown_velocity_m_s", String.format(Locale.US, "%.4f", observedTouchdownVelMps));

            // Separate Clocks
            props.setProperty("observed_descent_duration_s", String.format(Locale.US, "%.4f", observedDescentDurationS));
            props.setProperty("observed_flight_duration_s", String.format(Locale.US, "%.4f", observedFlightDurationS));

            // Backward compatibility aliases for existing readers
            props.setProperty("apogee_m", String.format(Locale.US, "%.4f", observedApogeeM));
            props.setProperty("apogee_ft", String.format(Locale.US, "%.4f", observedApogeeM * 3.28084));
            props.setProperty("time_to_apogee_s", String.format(Locale.US, "%.4f", observedApogeeTimeS));
            props.setProperty("burnout_time_s", String.format(Locale.US, "%.4f", observedBurnoutTimeS));
            props.setProperty("max_velocity_m_s", String.format(Locale.US, "%.4f", data.getMaxVelocity()));
            props.setProperty("max_mach", String.format(Locale.US, "%.4f", data.getMaxMachNumber()));
            props.setProperty("drogue_descent_rate_m_s", String.format(Locale.US, "%.4f", drogueMeanDescentRateMps));
            props.setProperty("drogue_descent_rate_fps", String.format(Locale.US, "%.4f", drogueMeanDescentRateMps * 3.28084));
            props.setProperty("drogue_terminal_velocity_m_s", String.format(Locale.US, "%.4f", drogueTerminalVelMps));
            props.setProperty("drogue_terminal_velocity_fps", String.format(Locale.US, "%.4f", drogueTerminalVelMps * 3.28084));
            props.setProperty("main_descent_rate_m_s", String.format(Locale.US, "%.4f", mainMeanDescentRateMps));
            props.setProperty("main_descent_rate_fps", String.format(Locale.US, "%.4f", mainMeanDescentRateMps * 3.28084));
            props.setProperty("main_terminal_velocity_m_s", String.format(Locale.US, "%.4f", mainTerminalVelMps));
            props.setProperty("main_terminal_velocity_fps", String.format(Locale.US, "%.4f", mainTerminalVelMps * 3.28084));
            props.setProperty("landing_time_s", String.format(Locale.US, "%.4f", observedLandingTimeS));
            props.setProperty("total_flight_time_s", String.format(Locale.US, "%.4f", observedFlightDurationS));
            props.setProperty("launch_mass_kg", String.format(Locale.US, "%.6f", observedLaunchMassKg));
            props.setProperty("burnout_mass_kg", String.format(Locale.US, "%.6f", observedBurnoutMassKg));

            props.setProperty("trajectory_samples", Integer.toString(dataLength));
            props.setProperty("warnings", data.getWarningSet() != null ? data.getWarningSet().toString() : "None");

            try (Writer writer = Files.newBufferedWriter(summaryPath)) {
                props.store(writer, "OpenRocket 23.09 Actual Run Results - Mode: " + mode);
            }
            System.out.println("Wrote summary properties to: " + summaryPath);

            System.out.println("------------------------------------------------------------------");
            System.out.println("RESULTS SUMMARY (" + mode + "):");
            System.out.printf(Locale.US, "  Observed Apogee:           %.2f m (%.1f ft)%n", observedApogeeM, observedApogeeM * 3.28084);
            System.out.printf(Locale.US, "  Observed Time to Apogee:   %.2f s%n", observedApogeeTimeS);
            System.out.printf(Locale.US, "  Observed Burnout Time:     %.2f s%n", observedBurnoutTimeS);
            System.out.printf(Locale.US, "  Observed Launch Mass:      %.4f kg (nominal: %.4f kg)%n", observedLaunchMassKg, nominalLaunchMassKg);
            System.out.printf(Locale.US, "  Observed Burnout Mass:     %.4f kg (nominal: %.4f kg)%n", observedBurnoutMassKg, nominalBurnoutMassKg);
            System.out.printf(Locale.US, "  Observed Drogue Terminal:  %.2f m/s (%.1f fps)%n", drogueTerminalVelMps, drogueTerminalVelMps * 3.28084);
            System.out.printf(Locale.US, "  Observed Main Terminal:    %.2f m/s (%.1f fps)%n", mainTerminalVelMps, mainTerminalVelMps * 3.28084);
            System.out.printf(Locale.US, "  Observed Descent Duration: %.2f s%n", observedDescentDurationS);
            System.out.printf(Locale.US, "  Observed Flight Duration:  %.2f s%n", observedFlightDurationS);
            System.out.println("==================================================================");

        } catch (Throwable t) {
            System.err.println("FATAL: Simulation failed with exception: " + t.getMessage());
            t.printStackTrace();
            System.exit(1);
        }
    }
}
