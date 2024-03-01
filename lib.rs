#![cfg_attr(not(feature = "std"), no_std, no_main)]
//! A playground contract that allows to execute JavaScript code on Phala Phat Contracts platform.

extern crate alloc;

#[ink::contract]
mod playground {
    use alloc::string::String;
    use alloc::vec;
    use alloc::vec::Vec;
    use phat_js as js;
    use scale::{Decode, Encode};

    #[derive(Debug, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum JsEngine {
        SidevmQuickJS,
        SidevmQuickJSWithPolyfill,
        JsDelegate,
        JsDelegate2,
        CustomDriver(String),
        CustomCodeHash(Hash),
    }

    impl JsEngine {
        fn into_delegate_code_hash(self) -> Result<Hash, String> {
            match self {
                JsEngine::SidevmQuickJS => get_driver("JsRuntime"),
                JsEngine::SidevmQuickJSWithPolyfill => get_driver("JsRuntime"),
                JsEngine::JsDelegate => get_driver("JsDelegate"),
                JsEngine::JsDelegate2 => get_driver("JsDelegate2"),
                JsEngine::CustomDriver(name) => get_driver(&name),
                JsEngine::CustomCodeHash(code) => Ok(code),
            }
        }
        fn is_sidevm(&self) -> bool {
            matches!(
                self,
                JsEngine::SidevmQuickJS | JsEngine::SidevmQuickJSWithPolyfill
            )
        }
        fn with_polyfill(&self) -> bool {
            matches!(self, JsEngine::SidevmQuickJSWithPolyfill)
        }
    }

    #[ink(storage)]
    pub struct Playground {}

    impl Playground {
        #[ink(constructor)]
        pub fn default() -> Self {
            Self {}
        }

        #[ink(message)]
        /// Executes the provided JavaScript code and returns the execution result.
        ///
        /// # Arguments
        ///
        /// * `engine` - The js engine to use.
        /// * `js_code` - The Javascript code to run
        /// * `args` - The arguments to pass to the Javascript code
        ///
        /// @ui js_code widget codemirror
        /// @ui js_code options.lang javascript
        pub fn run_js(
            &self,
            engine: JsEngine,
            js_code: String,
            args: Vec<String>,
        ) -> Result<js::JsValue, String> {
            if engine.is_sidevm() {
                if engine.with_polyfill() {
                    Ok(js::eval_async_js(&js_code, &args))
                } else {
                    Ok(pink::ext().js_eval(vec![js::JsCode::Source(js_code)], args))
                }
            } else {
                js::eval_with(engine.into_delegate_code_hash()?, &js_code, &args).map(Into::into)
            }
        }

        #[ink(message)]
        /// Same as prove_output except getting the code from given URL.
        pub fn run_js_from_url(
            &self,
            engine: JsEngine,
            code_url: String,
            args: Vec<String>,
        ) -> Result<js::JsValue, String> {
            let response = pink::http_get!(
                code_url,
                alloc::vec![("User-Agent".into(), "phat-contract".into())]
            );
            if (response.status_code / 100) != 2 {
                return Err("Failed to get code".into());
            }
            let js_code = String::from_utf8(response.body).map_err(|_| "Invalid code")?;
            self.run_js(engine, js_code, args)
        }
    }

    pub fn get_driver(name: &str) -> Result<Hash, String> {
        use phat_js::ConvertTo;
        let system = pink::system::SystemRef::instance();
        let delegate = system.get_driver(name.into()).ok_or("No JS driver found")?;
        Ok(delegate.convert_to())
    }
}
