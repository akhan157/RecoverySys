#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // The embedded WebDriver server is a test-only hook. It is compiled in
    // only when the non-default `e2e` cargo feature is enabled; shipped
    // release builds keep the default feature set and never link it.
    #[cfg(feature = "e2e")]
    let builder = builder
        .plugin(tauri_plugin_wdio_webdriver::init())
        .invoke_handler(tauri::generate_handler![e2e_webdriver_marker]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running RecoverySys");
}

/// ASCII marker so CI can assert the embedded WebDriver hook is present in the
/// feature-flagged test binary and absent from every shipped release binary.
/// The command is never registered in a default-features build.
#[cfg(feature = "e2e")]
#[tauri::command]
fn e2e_webdriver_marker() -> &'static str {
    "RECOVERYSYS_E2E_WEBDRIVER_MARKER"
}
