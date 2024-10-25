// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use enigo::{Button, Coordinate, Direction, Enigo, Mouse, Settings};
use image::{imageops::FilterType, ImageReader};
use tauri::Manager;
use xcap::Monitor;

#[derive(serde::Serialize)]
struct MonitorData {
    id: String,
    is_primary: bool,
    width: u32,
    height: u32,
}

#[tauri::command]
fn get_monitors() -> Result<Vec<MonitorData>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;

    Ok(monitors
        .into_iter()
        .map(|m| MonitorData {
            id: m.id().to_string(),
            is_primary: m.is_primary(),
            width: m.width(),
            height: m.height(),
        })
        .collect())
}

#[tauri::command]
async fn take_screenshot(
    app_handle: tauri::AppHandle,
    resize_x: u32,
    resize_y: u32,
) -> Result<String, String> {
    println!("-- Take screenshot");

    // Move Enigo operations into spawn_blocking
    let (cursor_x, cursor_y) = tokio::task::spawn_blocking(|| {
        let enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
        enigo.location().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    let now = std::time::Instant::now();
    let monitor = Monitor::from_point(cursor_x, cursor_y).map_err(|e| e.to_string())?;
    println!("-- Monitor: {:?}", now.elapsed());

    let now = std::time::Instant::now();
    let screenshot = monitor.capture_image().map_err(|e| e.to_string())?;
    println!("-- Capture: {:?}", now.elapsed());

    let app_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    // Create screenshots dir if not exists
    let screenshots_dir = app_path.join("./screenshots");
    tokio::fs::create_dir_all(&screenshots_dir)
        .await
        .map_err(|e| e.to_string())?;

    // Use a unique filename to avoid overwriting
    let path = screenshots_dir.join("screenshot.png");

    // Save screenshot directly to file without intermediate PNG bytes
    let now = std::time::Instant::now();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || screenshot.save(path_clone).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
    println!("-- Save: {:?}", now.elapsed());

    let path_clone2 = path.clone();
    let src_image = tokio::task::spawn_blocking(move || {
        ImageReader::open(&path_clone2).unwrap().decode().unwrap()
    })
    .await
    .map_err(|e| e.to_string())?;

    let dst_image = tokio::task::spawn_blocking(move || {
        src_image.resize(resize_x, resize_y, FilterType::Lanczos3)
    })
    .await
    .map_err(|e| e.to_string())?;

    let resized_path = screenshots_dir.join("screenshot_resized.png");
    tokio::task::spawn_blocking(move || dst_image.save(resized_path))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
    println!("-- Resized to width: {}, height: {}", resize_x, resize_y);
    println!("-- Resize: {:?}", now.elapsed());

    Ok(String::from("./screenshots/screenshot_resized.png"))
}

#[tauri::command]
fn move_mouse(x: i32, y: i32) -> Result<(), String> {
    println!("-- Move mouse: {:?}, {:?}", x, y);

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    enigo
        .move_mouse(x, y, Coordinate::Abs)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn mouse_click(side: String, x: Option<i32>, y: Option<i32>) -> Result<(), String> {
    println!("-- Mouse click: {:?}, {:?}", side, (x, y));

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    let button = match side.as_str() {
        "left" => Button::Left,
        "right" => Button::Right,
        _ => return Err("Invalid mouse button".to_string()),
    };

    if let (Some(x), Some(y)) = (x, y) {
        println!("-- Move: {:?}, {:?}", x, y);
        enigo
            .move_mouse(x, y, Coordinate::Abs)
            .map_err(|e| e.to_string())?;
    }

    println!("-- Click: {:?}", button);
    enigo
        .button(button, Direction::Click)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_cursor_position() -> Result<(i32, i32), String> {
    println!("-- Get cursor position");

    let enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    Ok(enigo.location().map_err(|e| e.to_string())?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            take_screenshot,
            move_mouse,
            mouse_click,
            get_cursor_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
