/// IClassFactory for XmlPreviewHandler.

#[cfg(target_os = "windows")]
mod inner {
    use windows::Win32::System::Com::{IClassFactory, IClassFactory_Impl};
    use windows_core::{implement, IUnknown, Interface, GUID, HRESULT, BOOL};

    use crate::preview_handler::XmlPreviewHandler;

    const CLASS_E_NOAGGREGATION: HRESULT = HRESULT(-2147221232i32);

    #[implement(IClassFactory)]
    pub struct XmlPreviewHandlerFactory;

    impl IClassFactory_Impl for XmlPreviewHandlerFactory_Impl {
        fn CreateInstance(
            &self,
            punkouter: windows_core::Ref<'_, IUnknown>,
            riid: *const GUID,
            ppvobject: *mut *mut core::ffi::c_void,
        ) -> windows_core::Result<()> {
            if !punkouter.is_null() {
                return Err(windows_core::Error::from(CLASS_E_NOAGGREGATION));
            }
            if ppvobject.is_null() {
                return Err(windows_core::Error::from(HRESULT(-2147467261i32))); // E_POINTER
            }
            let handler = XmlPreviewHandler::new();
            let unknown: IUnknown = handler.into();
            unsafe { unknown.query(riid, ppvobject).ok() }
        }

        fn LockServer(&self, _flock: BOOL) -> windows_core::Result<()> {
            Ok(())
        }
    }
}

#[cfg(target_os = "windows")]
pub use inner::XmlPreviewHandlerFactory;
