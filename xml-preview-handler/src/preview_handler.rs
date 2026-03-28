/// Windows Shell Preview Handler COM implementation.
///
/// Implements IPreviewHandler, IInitializeWithFile, IObjectWithSite.
/// Threading model: Apartment (STA).

#[cfg(target_os = "windows")]
mod inner {
    use std::cell::UnsafeCell;
    use std::sync::Once;

    use windows::Win32::Foundation::{HWND, LRESULT, LPARAM, RECT, WPARAM};
    use windows::Win32::Graphics::Gdi::{BeginPaint, EndPaint, PAINTSTRUCT, InvalidateRect};
    use windows::Win32::System::Ole::{IObjectWithSite, IObjectWithSite_Impl};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::Shell::{IPreviewHandler, IPreviewHandler_Impl};
    use windows::Win32::UI::Shell::PropertiesSystem::{
        IInitializeWithFile, IInitializeWithFile_Impl,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, GetWindowLongPtrW, RegisterClassExW, SetWindowLongPtrW,
        SetWindowPos, ShowWindow,
        CS_HREDRAW, CS_VREDRAW, GWLP_USERDATA,
        SWP_NOZORDER, SWP_NOACTIVATE,
        SW_SHOW,
        WM_DESTROY, WM_ERASEBKGND, WM_PAINT,
        WS_CHILD, WS_CLIPCHILDREN, WNDCLASSEXW, MSG,
        DefWindowProcW,
    };
    use windows_core::{
        implement, w, IUnknown, GUID, HRESULT, PCWSTR,
    };

    use crate::xml_info::XmlPreviewInfo;

    const WND_CLASS: PCWSTR = w!("XmlPreviewHandlerBrWnd");
    const NULL_HWND: HWND   = HWND(std::ptr::null_mut());

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    struct State {
        hwnd_parent:  HWND,
        hwnd_preview: HWND,
        rect:         RECT,
        info:         Option<XmlPreviewInfo>,
    }

    // -----------------------------------------------------------------------
    // COM object
    // -----------------------------------------------------------------------

    #[implement(IPreviewHandler, IInitializeWithFile, IObjectWithSite)]
    pub struct XmlPreviewHandler {
        state: UnsafeCell<State>,
    }

    // SAFETY: COM STA ensures single-threaded access.
    unsafe impl Send for XmlPreviewHandler {}
    unsafe impl Sync for XmlPreviewHandler {}

    impl XmlPreviewHandler {
        pub fn new() -> Self {
            XmlPreviewHandler {
                state: UnsafeCell::new(State {
                    hwnd_parent:  NULL_HWND,
                    hwnd_preview: NULL_HWND,
                    rect:         RECT::default(),
                    info:         None,
                }),
            }
        }

        #[inline]
        unsafe fn state(&self) -> &mut State {
            &mut *self.state.get()
        }
    }

    // -----------------------------------------------------------------------
    // IInitializeWithFile
    // -----------------------------------------------------------------------

    impl IInitializeWithFile_Impl for XmlPreviewHandler_Impl {
        fn Initialize(&self, pszfilepath: &PCWSTR, _grfmode: u32) -> windows_core::Result<()> {
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let path = unsafe { pszfilepath.to_string() }
                    .map_err(|_| windows_core::Error::from(HRESULT(-2147467259i32)))?;
                let xml = std::fs::read_to_string(&path)
                    .map_err(|_| windows_core::Error::from(HRESULT(-2147467259i32)))?;
                unsafe { self.state().info = Some(crate::xml_info::parse(&xml)) };
                Ok(())
            }))
            .unwrap_or_else(|_| Err(windows_core::Error::from(HRESULT(-2147467259i32))))
        }
    }

    // -----------------------------------------------------------------------
    // IPreviewHandler
    // -----------------------------------------------------------------------

    impl IPreviewHandler_Impl for XmlPreviewHandler_Impl {
        fn SetWindow(&self, hwnd: HWND, prc: *const RECT) -> windows_core::Result<()> {
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                unsafe {
                    let s = self.state();
                    s.hwnd_parent = hwnd;
                    if !prc.is_null() { s.rect = *prc; }

                    if s.hwnd_preview.0.is_null() {
                        ensure_window_class_registered();
                        let r = &s.rect;
                        let hwnd_prev = CreateWindowExW(
                            Default::default(),
                            WND_CLASS,
                            PCWSTR::null(),
                            WS_CHILD | WS_CLIPCHILDREN,
                            r.left, r.top,
                            r.right - r.left, r.bottom - r.top,
                            Some(hwnd),
                            None,
                            GetModuleHandleW(PCWSTR::null()).ok()
                                .map(|h| windows::Win32::Foundation::HINSTANCE(h.0)),
                            None,
                        );
                        // CreateWindowExW returns Result<HWND> in windows 0.61
                        s.hwnd_preview = hwnd_prev.unwrap_or(NULL_HWND);
                    }
                }
                Ok(())
            }))
            .unwrap_or_else(|_| Err(windows_core::Error::from(HRESULT(-2147467259i32))))
        }

        fn SetRect(&self, prc: *const RECT) -> windows_core::Result<()> {
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                unsafe {
                    let s = self.state();
                    if !prc.is_null() { s.rect = *prc; }
                    if !s.hwnd_preview.0.is_null() {
                        let r = &s.rect;
                        let _ = SetWindowPos(
                            s.hwnd_preview, None,
                            r.left, r.top,
                            r.right - r.left, r.bottom - r.top,
                            SWP_NOZORDER | SWP_NOACTIVATE,
                        );
                    }
                }
                Ok(())
            }))
            .unwrap_or_else(|_| Err(windows_core::Error::from(HRESULT(-2147467259i32))))
        }

        fn DoPreview(&self) -> windows_core::Result<()> {
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                unsafe {
                    let s = self.state();
                    let hwnd = s.hwnd_preview;
                    if hwnd.0.is_null() { return Ok(()); }

                    if let Some(ref info) = s.info {
                        let ptr = info as *const XmlPreviewInfo as isize;
                        SetWindowLongPtrW(hwnd, GWLP_USERDATA, ptr);
                    }

                    let _ = ShowWindow(hwnd, SW_SHOW);
                    let _ = InvalidateRect(Some(hwnd), None, true);
                }
                Ok(())
            }))
            .unwrap_or_else(|_| Err(windows_core::Error::from(HRESULT(-2147467259i32))))
        }

        fn Unload(&self) -> windows_core::Result<()> {
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                unsafe {
                    let s = self.state();
                    if !s.hwnd_preview.0.is_null() {
                        SetWindowLongPtrW(s.hwnd_preview, GWLP_USERDATA, 0);
                        let _ = DestroyWindow(s.hwnd_preview);
                        s.hwnd_preview = NULL_HWND;
                    }
                    s.info = None;
                }
                Ok(())
            }))
            .unwrap_or_else(|_| Err(windows_core::Error::from(HRESULT(-2147467259i32))))
        }

        fn SetFocus(&self) -> windows_core::Result<()> {
            // Optional: no-op for basic preview functionality
            Ok(())
        }

        fn QueryFocus(&self) -> windows_core::Result<HWND> {
            // Optional: E_NOTIMPL is acceptable
            Err(windows_core::Error::from(HRESULT(-2147467263i32)))
        }

        fn TranslateAccelerator(&self, _pmsg: *const MSG) -> windows_core::Result<()> {
            // S_FALSE: we don't handle accelerators
            Err(windows_core::Error::from(HRESULT(1)))
        }
    }

    // -----------------------------------------------------------------------
    // IObjectWithSite
    // -----------------------------------------------------------------------

    impl IObjectWithSite_Impl for XmlPreviewHandler_Impl {
        fn SetSite(&self, _punksite: windows_core::Ref<'_, IUnknown>) -> windows_core::Result<()> {
            Ok(())
        }

        fn GetSite(
            &self,
            _riid: *const GUID,
            _ppvsite: *mut *mut core::ffi::c_void,
        ) -> windows_core::Result<()> {
            Err(windows_core::Error::from(HRESULT(-2147467263i32))) // E_NOTIMPL
        }
    }

    // -----------------------------------------------------------------------
    // Window class registration (once per process)
    // -----------------------------------------------------------------------

    static REGISTER_CLASS: Once = Once::new();

    unsafe fn ensure_window_class_registered() {
        REGISTER_CLASS.call_once(|| {
            let hinstance = GetModuleHandleW(PCWSTR::null())
                .map(|h| windows::Win32::Foundation::HINSTANCE(h.0))
                .unwrap_or_default();
            let wc = WNDCLASSEXW {
                cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(preview_wnd_proc),
                hInstance: hinstance,
                lpszClassName: WND_CLASS,
                ..Default::default()
            };
            RegisterClassExW(&wc);
        });
    }

    // -----------------------------------------------------------------------
    // Window procedure
    // -----------------------------------------------------------------------

    unsafe extern "system" fn preview_wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        match msg {
            WM_PAINT => {
                let ptr = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *const XmlPreviewInfo;
                if ptr.is_null() {
                    let mut ps = PAINTSTRUCT::default();
                    let _hdc = BeginPaint(hwnd, &mut ps);
                    let _ = EndPaint(hwnd, &ps);
                } else {
                    // SAFETY: pointer is set before DoPreview and cleared before Unload.
                    crate::renderer::paint(hwnd, &*ptr);
                }
                LRESULT(0)
            }
            WM_ERASEBKGND => LRESULT(1), // Handled in WM_PAINT
            WM_DESTROY => {
                SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
                DefWindowProcW(hwnd, msg, wparam, lparam)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}

#[cfg(target_os = "windows")]
pub use inner::XmlPreviewHandler;
