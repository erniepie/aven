// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use enigo::{Button, Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings};
use image::{imageops::FilterType, ImageReader};
use tauri::Manager;
use xcap::Monitor;

#[derive(serde::Serialize)]
struct MonitorData {
    id: String,
    is_primary: bool,
    name: String,
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
            name: m.name().to_string(),
            width: m.width(),
            height: m.height(),
        })
        .collect())
}

#[tauri::command]
async fn take_screenshot(
    app_handle: tauri::AppHandle,
    monitor_id: String,
    resize_x: u32,
    resize_y: u32,
) -> Result<String, String> {
    println!("-- Take screenshot");

    let monitor = get_monitor_by_id(monitor_id)?;

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
fn move_mouse(monitor_id: String, x: i32, y: i32) -> Result<(), String> {
    println!("-- Move mouse: {:?}, {:?}", x, y);

    let monitor = get_monitor_by_id(monitor_id)?;

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    enigo
        .move_mouse(monitor.x() + x, monitor.y() + y, Coordinate::Abs)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn mouse_click(
    monitor_id: String,
    side: String,
    x: Option<i32>,
    y: Option<i32>,
) -> Result<(), String> {
    println!("-- Mouse click: {:?}, {:?}", side, (x, y));

    let monitor = get_monitor_by_id(monitor_id)?;

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    let button = match side.as_str() {
        "left" => Button::Left,
        "right" => Button::Right,
        _ => return Err("Invalid mouse button".to_string()),
    };

    if let (Some(x), Some(y)) = (x, y) {
        println!("-- Move: {:?}, {:?}", x, y);
        enigo
            .move_mouse(monitor.x() + x, monitor.y() + y, Coordinate::Abs)
            .map_err(|e| e.to_string())?;
    }

    println!("-- Click: {:?}", button);
    enigo
        .button(button, Direction::Click)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_cursor_position(monitor_id: String) -> Result<(i32, i32), String> {
    println!("-- Get cursor position");

    let monitor = get_monitor_by_id(monitor_id)?;

    let enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    Ok(enigo
        .location()
        .map(|(x, y)| (x + monitor.x(), y + monitor.y()))
        .map_err(|e| e.to_string())?)
}

#[tauri::command]
fn type_text(text: String) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    enigo.text(&text).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn press_key(key: String) -> Result<(), String> {
    // key examples: "a", "Return", "alt+Tab", "ctrl+s", "Up", "KP_0" (for the numpad 0 key).

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;

    // see if there is a special key before the key name like ctrl, shift, alt, cmd, etc
    // if so, split the string by the special key and press the special key and the key name
    // otherwise, just press the key name

    let key_name: String;
    let mut special_key: Option<String> = None;

    if key.contains("+") {
        let parts = key.split("+").collect::<Vec<&str>>();
        special_key = Some(parts[0].to_string());
        key_name = parts[1].to_string();
    } else {
        key_name = key;
    }

    if let Some(special_key) = special_key {
        let key = get_key_from_name(special_key)?;

        enigo
            .key(key, Direction::Click)
            .map_err(|e| e.to_string())?;
    }

    let key = get_key_from_name(key_name)?;

    enigo
        .key(key, Direction::Click)
        .map_err(|e| e.to_string())?;

    Ok(())
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
            get_cursor_position,
            type_text,
            press_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_monitor_by_id(monitor_id: String) -> Result<Monitor, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.iter().find(|m| m.id().to_string() == monitor_id);

    if monitor.is_none() {
        return Err("Monitor not found".to_string());
    }

    Ok(monitor.unwrap().clone())
}

// This need a mapping from the key name to the enigo key
// https://docs.rs/enigo/latest/src/enigo/keycodes.rs.html
fn get_key_from_name(key_name: String) -> Result<Key, String> {
    match key_name.as_str() {
        #[cfg(target_os = "windows")]
        "0" => Ok(Key::Num0),
        #[cfg(target_os = "windows")]
        "1" => Ok(Key::Num1),
        #[cfg(target_os = "windows")]
        "2" => Ok(Key::Num2),
        #[cfg(target_os = "windows")]
        "3" => Ok(Key::Num3),
        #[cfg(target_os = "windows")]
        "4" => Ok(Key::Num4),
        #[cfg(target_os = "windows")]
        "5" => Ok(Key::Num5),
        #[cfg(target_os = "windows")]
        "6" => Ok(Key::Num6),
        #[cfg(target_os = "windows")]
        "7" => Ok(Key::Num7),
        #[cfg(target_os = "windows")]
        "8" => Ok(Key::Num8),
        #[cfg(target_os = "windows")]
        "9" => Ok(Key::Num9),
        #[cfg(target_os = "windows")]
        "a" | "A" => Ok(Key::A),
        #[cfg(target_os = "windows")]
        "b" | "B" => Ok(Key::B),
        #[cfg(target_os = "windows")]
        "c" | "C" => Ok(Key::C),
        #[cfg(target_os = "windows")]
        "d" | "D" => Ok(Key::D),
        #[cfg(target_os = "windows")]
        "e" | "E" => Ok(Key::E),
        #[cfg(target_os = "windows")]
        "f" | "F" => Ok(Key::F),
        #[cfg(target_os = "windows")]
        "g" | "G" => Ok(Key::G),
        #[cfg(target_os = "windows")]
        "h" | "H" => Ok(Key::H),
        #[cfg(target_os = "windows")]
        "i" | "I" => Ok(Key::I),
        #[cfg(target_os = "windows")]
        "j" | "J" => Ok(Key::J),
        #[cfg(target_os = "windows")]
        "k" | "K" => Ok(Key::K),
        #[cfg(target_os = "windows")]
        "l" | "L" => Ok(Key::L),
        #[cfg(target_os = "windows")]
        "m" | "M" => Ok(Key::M),
        #[cfg(target_os = "windows")]
        "n" | "N" => Ok(Key::N),
        #[cfg(target_os = "windows")]
        "o" | "O" => Ok(Key::O),
        #[cfg(target_os = "windows")]
        "p" | "P" => Ok(Key::P),
        #[cfg(target_os = "windows")]
        "q" | "Q" => Ok(Key::Q),
        #[cfg(target_os = "windows")]
        "r" | "R" => Ok(Key::R),
        #[cfg(target_os = "windows")]
        "s" | "S" => Ok(Key::S),
        #[cfg(target_os = "windows")]
        "t" | "T" => Ok(Key::T),
        #[cfg(target_os = "windows")]
        "u" | "U" => Ok(Key::U),
        #[cfg(target_os = "windows")]
        "v" | "V" => Ok(Key::V),
        #[cfg(target_os = "windows")]
        "w" | "W" => Ok(Key::W),
        #[cfg(target_os = "windows")]
        "x" | "X" => Ok(Key::X),
        #[cfg(target_os = "windows")]
        "y" | "Y" => Ok(Key::Y),
        #[cfg(target_os = "windows")]
        "z" | "Z" => Ok(Key::Z),
        "alt" => Ok(Key::Alt),
        "backspace" => Ok(Key::Backspace),
        "capslock" => Ok(Key::CapsLock),
        "control" | "ctrl" => Ok(Key::Control),
        "delete" => Ok(Key::Delete),
        "downarrow" | "down" => Ok(Key::DownArrow),
        "end" => Ok(Key::End),
        "escape" | "esc" => Ok(Key::Escape),
        "f1" => Ok(Key::F1),
        "f2" => Ok(Key::F2),
        "f3" => Ok(Key::F3),
        "f4" => Ok(Key::F4),
        "f5" => Ok(Key::F5),
        "f6" => Ok(Key::F6),
        "f7" => Ok(Key::F7),
        "f8" => Ok(Key::F8),
        "f9" => Ok(Key::F9),
        "f10" => Ok(Key::F10),
        "f11" => Ok(Key::F11),
        "f12" => Ok(Key::F12),
        "home" => Ok(Key::Home),
        "leftarrow" | "left" => Ok(Key::LeftArrow),
        "meta" | "command" | "windows" | "super" => Ok(Key::Meta),
        "option" => Ok(Key::Option),
        "pagedown" => Ok(Key::PageDown),
        "pageup" => Ok(Key::PageUp),
        "return" | "enter" => Ok(Key::Return),
        "rightarrow" | "right" => Ok(Key::RightArrow),
        "shift" => Ok(Key::Shift),
        "space" => Ok(Key::Space),
        "tab" => Ok(Key::Tab),
        "uparrow" | "up" => Ok(Key::UpArrow),
        _ => {
            // Try to parse as Unicode character if it's a single char
            if key_name.chars().count() == 1 {
                Ok(Key::Unicode(key_name.chars().next().unwrap()))
            } else {
                Err(format!("Unknown key: {}", key_name))
            }
        }
    }
}
