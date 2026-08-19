mod pdf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_scoped_storage::init())
        .invoke_handler(tauri::generate_handler![html_to_pdf])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn html_to_pdf(app: tauri::AppHandle, html: String, dest: String) -> Result<(), String> {
    pdf::render(app, html, dest)
}
