//! Windows Shell Preview Handler DLL for XML Viewer BR.
//!
//! CLSID: {A3F82D1E-C6B4-4E7F-9D2A-18FE05C47B3D}

pub mod xml_info;
pub mod renderer;

#[cfg(target_os = "windows")]
pub mod preview_handler;
#[cfg(target_os = "windows")]
pub mod class_factory;

#[cfg(target_os = "windows")]
mod dll {
    use std::sync::atomic::{AtomicIsize, AtomicU32, Ordering};

    use windows::Win32::Foundation::{
        ERROR_SUCCESS, HINSTANCE, HMODULE,
    };
    use windows::Win32::System::Com::{IClassFactory};
    use windows::Win32::System::LibraryLoader::GetModuleFileNameW;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyExW, RegDeleteTreeW, RegOpenKeyExW, RegSetValueExW,
        RegDeleteValueW,
        KEY_WRITE, HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE,
        REG_OPTION_NON_VOLATILE, REG_SZ, REG_CREATE_KEY_DISPOSITION,
    };
    use windows::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};
    use windows_core::{BOOL, Interface, GUID, HRESULT, PCWSTR};

    use super::class_factory::XmlPreviewHandlerFactory;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    pub const CLSID_XML_PREVIEW_HANDLER: GUID =
        GUID::from_u128(0xa3f82d1e_c6b4_4e7f_9d2a_18fe05c47b3d);

    const CLSID_PREVIEW_HANDLER_EXT: &str = "{8895b1c6-b41f-4c1c-a562-0d564250836f}";
    const OUR_CLSID_STR: &str  = "{A3F82D1E-C6B4-4E7F-9D2A-18FE05C47B3D}";
    const PREVHOST_APPID: &str = "{6D2B5079-2F0B-48DD-AB7F-97CEC514D30B}";
    const HANDLER_NAME: &str   = "XML Viewer BR Preview Handler";

    const S_OK:    HRESULT = HRESULT(0);
    const S_FALSE: HRESULT = HRESULT(1);
    const E_FAIL:  HRESULT = HRESULT(-2147467259i32);
    const CLASS_E_CLASSNOTAVAILABLE: HRESULT = HRESULT(-2147221231i32);

    // -----------------------------------------------------------------------
    // Global state
    // -----------------------------------------------------------------------

    /// HINSTANCE of this DLL (as isize for atomic storage).
    static DLL_HMODULE: AtomicIsize = AtomicIsize::new(0);

    pub static OBJECT_COUNT: AtomicU32 = AtomicU32::new(0);

    // -----------------------------------------------------------------------
    // DllMain
    // -----------------------------------------------------------------------

    #[no_mangle]
    pub unsafe extern "system" fn DllMain(
        hinstdll: HINSTANCE,
        fdwreason: u32,
        _lpvreserved: *mut core::ffi::c_void,
    ) -> BOOL {
        const DLL_PROCESS_ATTACH: u32 = 1;
        if fdwreason == DLL_PROCESS_ATTACH {
            DLL_HMODULE.store(hinstdll.0 as isize, Ordering::SeqCst);
        }
        BOOL(1)
    }

    // -----------------------------------------------------------------------
    // DllGetClassObject
    // -----------------------------------------------------------------------

    #[no_mangle]
    pub unsafe extern "system" fn DllGetClassObject(
        rclsid: *const GUID,
        riid: *const GUID,
        ppv: *mut *mut core::ffi::c_void,
    ) -> HRESULT {
        if rclsid.is_null() || riid.is_null() || ppv.is_null() {
            return E_FAIL;
        }
        if *rclsid != CLSID_XML_PREVIEW_HANDLER {
            return CLASS_E_CLASSNOTAVAILABLE;
        }
        let factory: IClassFactory = XmlPreviewHandlerFactory.into();
        let unknown: windows_core::IUnknown = match factory.cast() {
            Ok(u) => u,
            Err(e) => return e.code(),
        };
        unknown.query(riid, ppv)
    }

    // -----------------------------------------------------------------------
    // DllCanUnloadNow
    // -----------------------------------------------------------------------

    #[no_mangle]
    pub extern "system" fn DllCanUnloadNow() -> HRESULT {
        if OBJECT_COUNT.load(Ordering::Relaxed) == 0 {
            S_OK
        } else {
            S_FALSE
        }
    }

    // -----------------------------------------------------------------------
    // DllRegisterServer
    // -----------------------------------------------------------------------

    #[no_mangle]
    pub unsafe extern "system" fn DllRegisterServer() -> HRESULT {
        match write_registry(HKEY_LOCAL_MACHINE) {
            S_OK => S_OK,
            _ => write_registry(HKEY_CURRENT_USER),
        }
    }

    unsafe fn write_registry(root: HKEY) -> HRESULT {
        // Get DLL path via stored HMODULE
        let hmod = HMODULE(DLL_HMODULE.load(Ordering::SeqCst) as *mut _);
        let mut path_buf = [0u16; 512];
        let len = GetModuleFileNameW(Some(hmod), &mut path_buf);
        if len == 0 { return E_FAIL; }
        let dll_path = String::from_utf16_lossy(&path_buf[..len as usize]);

        // 1. Shell extension for .xml
        let ext_key = format!("Software\\Classes\\.xml\\shellex\\{}", CLSID_PREVIEW_HANDLER_EXT);
        if let Some(hk) = create_key(root, &ext_key) {
            let _ = set_str(hk, "", OUR_CLSID_STR);
            let _ = RegCloseKey(hk);
        } else { return E_FAIL; }

        // 2. InProcServer32
        let inproc_key = format!("Software\\Classes\\CLSID\\{}\\InProcServer32", OUR_CLSID_STR);
        if let Some(hk) = create_key(root, &inproc_key) {
            let _ = set_str(hk, "", &dll_path);
            let _ = set_str(hk, "ThreadingModel", "Apartment");
            let _ = RegCloseKey(hk);
        } else { return E_FAIL; }

        // 3. CLSID root: name + AppID for prevhost.exe sandboxing
        let clsid_key = format!("Software\\Classes\\CLSID\\{}", OUR_CLSID_STR);
        if let Some(hk) = create_key(root, &clsid_key) {
            let _ = set_str(hk, "", HANDLER_NAME);
            let _ = set_str(hk, "AppID", PREVHOST_APPID);
            let _ = RegCloseKey(hk);
        }

        // 4. Global PreviewHandlers catalogue
        let ph_key = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PreviewHandlers";
        if let Some(hk) = create_key(root, ph_key) {
            let _ = set_str(hk, OUR_CLSID_STR, HANDLER_NAME);
            let _ = RegCloseKey(hk);
        }

        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
        S_OK
    }

    // -----------------------------------------------------------------------
    // DllUnregisterServer
    // -----------------------------------------------------------------------

    #[no_mangle]
    pub unsafe extern "system" fn DllUnregisterServer() -> HRESULT {
        for &root in &[HKEY_LOCAL_MACHINE, HKEY_CURRENT_USER] {
            remove_registry(root);
        }
        S_OK
    }

    unsafe fn remove_registry(root: HKEY) {
        let ext_key = format!("Software\\Classes\\.xml\\shellex\\{}", CLSID_PREVIEW_HANDLER_EXT);
        delete_key(root, &ext_key);

        let clsid_key = format!("Software\\Classes\\CLSID\\{}", OUR_CLSID_STR);
        delete_key(root, &clsid_key);

        let ph_key = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PreviewHandlers";
        if let Some(hk) = open_key_write(root, ph_key) {
            let name_w = wide(OUR_CLSID_STR);
            let _ = RegDeleteValueW(hk, PCWSTR(name_w.as_ptr()));
            let _ = RegCloseKey(hk);
        }

        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
    }

    // -----------------------------------------------------------------------
    // Registry helpers
    // -----------------------------------------------------------------------

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }

    unsafe fn create_key(root: HKEY, subkey: &str) -> Option<HKEY> {
        let sw = wide(subkey);
        let mut hkey = HKEY(std::ptr::null_mut());
        let mut disp = REG_CREATE_KEY_DISPOSITION::default();
        let r = RegCreateKeyExW(
            root,
            PCWSTR(sw.as_ptr()),
            None,            // reserved
            PCWSTR::null(),  // class
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,            // security attributes
            &mut hkey,
            Some(&mut disp),
        );
        if r == ERROR_SUCCESS { Some(hkey) } else { None }
    }

    unsafe fn open_key_write(root: HKEY, subkey: &str) -> Option<HKEY> {
        let sw = wide(subkey);
        let mut hkey = HKEY(std::ptr::null_mut());
        let r = RegOpenKeyExW(root, PCWSTR(sw.as_ptr()), None, KEY_WRITE, &mut hkey);
        if r == ERROR_SUCCESS { Some(hkey) } else { None }
    }

    unsafe fn set_str(hkey: HKEY, name: &str, value: &str) -> bool {
        let nw = wide(name);
        let vw: Vec<u16> = value.encode_utf16().chain(Some(0)).collect();
        let vb = std::slice::from_raw_parts(vw.as_ptr() as *const u8, vw.len() * 2);
        let r = RegSetValueExW(hkey, PCWSTR(nw.as_ptr()), None, REG_SZ, Some(vb));
        r == ERROR_SUCCESS
    }

    unsafe fn delete_key(root: HKEY, subkey: &str) {
        let sw = wide(subkey);
        let _ = RegDeleteTreeW(root, PCWSTR(sw.as_ptr()));
    }
}

#[cfg(target_os = "windows")]
pub use dll::{DllCanUnloadNow, DllGetClassObject, DllMain, DllRegisterServer, DllUnregisterServer};
