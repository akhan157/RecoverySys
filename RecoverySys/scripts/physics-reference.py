"""Independent review calculations; imports no RecoverySys model code.

Uses SI force balance, ideal-gas troposphere, and exact international inch/foot.
Output is a review packet, never an acceptance decision or flight validation.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
G = 9.80665
R = 287.05287
T0 = 288.15
P0 = 101325.0
L = 0.0065

def density(height):
    temperature = T0 - L * height
    pressure = P0 * (temperature / T0) ** (G / (R * L))
    return pressure / (R * temperature)

rows = []
for filename in ['isa-density-sea-level', 'isa-density-5000m', 'terminal-descent-36in-main-sea-level', 'landing-energy-36in-main-sea-level']:
    case = json.loads((ROOT / 'validation/corpus' / (filename + '.json')).read_text())
    inputs = case['inputs']
    if 'altitude_m' in inputs:
        result = density(inputs['altitude_m'])
        equation = 'rho = P0*(T/T0)^(g/(R*L))/(R*T); T=T0-L*h'
    else:
        diameter = inputs['chuteSpecs']['diameter_in'] * 0.0254
        area = math.pi * diameter**2 / 4
        velocity = math.sqrt(2 * inputs['mass_kg'] * G / (density(inputs['altitude_ft'] * 0.3048) * inputs['chuteSpecs']['cd'] * area))
        if filename.startswith('landing-energy'):
            result = round(0.5 * inputs['mass_kg'] * velocity**2 / 1.3558179483314004)
            equation = 'KE = 0.5*m*v^2; J / 1.3558179483314004 -> ft-lbf, rounded'
        else:
            result = velocity / 0.3048
            equation = 'v=sqrt(2*m*g/(rho*Cd*pi*d^2/4)); m/s / 0.3048 -> ft/s'
    expected = case['expected']['metrics'][0]
    rows.append({'case':filename,'reference':result,'recordedExpected':expected['value'],'unit':expected['unit'],'difference':result-expected['value'],'withinRecordedTolerance':abs(result-expected['value']) <= expected['tolerance']['absolute'],'equation':equation,'status':'requires-independent-review'})
print(json.dumps({'status':'review-only','constants':{'g_m_s2':G,'R_J_kg_K':R,'T0_K':T0,'P0_Pa':P0,'lapse_K_m':L},'sources':['https://www.grc.nasa.gov/www/k-12/airplane/atmosmet.html','https://www.grc.nasa.gov/www/k-12/airplane/termv.html'],'limitations':['Shared governing equations are not independent experimental evidence.','More precise reference constants and exact conversions can exceed existing extremely tight regression tolerances. Review tolerance basis before accepting cases.','No case acceptance or production model changes are performed.'],'cases':rows},indent=2))
