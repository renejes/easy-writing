//! Off-screen WKWebView HTML → PDF (macOS).

#[cfg(not(target_os = "macos"))]
pub fn render(_app: tauri::AppHandle, _html: String, _dest: String) -> Result<(), String> {
    Err("PDF export is only available on macOS.".into())
}

#[cfg(target_os = "macos")]
pub fn render(app: tauri::AppHandle, html: String, dest: String) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let result = render_pdf_on_main_thread(&html, &dest);
        let _ = tx.send(result);
    })
    .map_err(|error| error.to_string())?;
    rx.recv().map_err(|error| error.to_string())?
}

#[cfg(target_os = "macos")]
fn render_pdf_on_main_thread(html: &str, output_path: &str) -> Result<(), String> {
    use std::sync::{Arc, Mutex};

    use block2::RcBlock;
    use objc2::rc::Retained;
    use objc2::{msg_send, MainThreadMarker, MainThreadOnly};
    use objc2_core_foundation::{CGPoint, CGRect, CGSize};
    use objc2_foundation::{NSData, NSError, NSString};
    use objc2_web_kit::{WKWebView, WKWebViewConfiguration};

    let mtm = MainThreadMarker::new().ok_or("PDF export must run on the main thread")?;
    let config = unsafe { WKWebViewConfiguration::new(mtm) };
    let frame = CGRect::new(CGPoint::new(0.0, 0.0), CGSize::new(794.0, 1123.0));
    let webview = unsafe {
        WKWebView::initWithFrame_configuration(WKWebView::alloc(mtm), frame, &config)
    };
    let html_ns = NSString::from_str(html);
    unsafe { webview.loadHTMLString_baseURL(&html_ns, None) };

    let mut ready = false;
    for _ in 0..150 {
        run_loop_tick(0.1);
        if eval_title(&webview).as_deref() == Some("READY") {
            ready = true;
            break;
        }
    }
    if !ready {
        return Err("PDF renderer timed out while loading HTML.".into());
    }

    let result: Arc<Mutex<Option<Result<Vec<u8>, String>>>> = Arc::new(Mutex::new(None));
    let result_clone = result.clone();
    let block = RcBlock::new(move |data: *mut NSData, error: *mut NSError| {
        let value = if !error.is_null() {
            let err_str: Retained<NSString> = unsafe { msg_send![&*error, localizedDescription] };
            Err(format!("createPDF failed: {err_str}"))
        } else if data.is_null() {
            Err("createPDF returned no data.".into())
        } else {
            Ok(unsafe { &*data }.to_vec())
        };
        *result_clone.lock().unwrap() = Some(value);
    });

    unsafe {
        webview.createPDFWithConfiguration_completionHandler(None, &*block);
    }

    for _ in 0..400 {
        run_loop_tick(0.05);
        if result.lock().unwrap().is_some() {
            break;
        }
    }

    let pdf_bytes = result
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "createPDF timed out.".to_string())??;

    std::fs::write(output_path, pdf_bytes).map_err(|error| format!("Could not write PDF: {error}"))
}

#[cfg(target_os = "macos")]
fn eval_title(webview: &objc2_web_kit::WKWebView) -> Option<String> {
    use std::sync::{Arc, Mutex};

    use block2::RcBlock;
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2::msg_send;
    use objc2_foundation::{NSError, NSString};

    let result: Arc<Mutex<Option<Option<String>>>> = Arc::new(Mutex::new(None));
    let result_clone = result.clone();
    let script = NSString::from_str("document.title");
    let block = RcBlock::new(move |value: *mut AnyObject, _error: *mut NSError| {
        let val = if value.is_null() {
            None
        } else {
            let desc: Retained<NSString> = unsafe { msg_send![&*value, description] };
            Some(desc.to_string())
        };
        *result_clone.lock().unwrap() = Some(val);
    });
    unsafe {
        webview.evaluateJavaScript_completionHandler(&script, Some(&*block));
    }
    for _ in 0..50 {
        run_loop_tick(0.01);
        if result.lock().unwrap().is_some() {
            break;
        }
    }
    let title = result.lock().unwrap().take().flatten();
    title
}

#[cfg(target_os = "macos")]
fn run_loop_tick(seconds: f64) {
    use objc2_core_foundation::{kCFRunLoopDefaultMode, CFRunLoop};
    unsafe {
        CFRunLoop::run_in_mode(kCFRunLoopDefaultMode, seconds, false);
    }
}
