#![cfg_attr(not(feature = "std"), no_std, no_main)]
//! This is a smart contract running on the Phala Phat Contract platform.
//! It provides a proof of code execution. When the user calls the `prove_output` method and passes in a piece of JavaScript code,
//! the contract executes this code and outputs the execution result and the hash of the code as the result.

extern crate alloc;

#[ink::contract]
mod proven {
    use alloc::string::String;
    use alloc::vec::Vec;
    use pink::{chain_extension::SigType, system::SystemRef, ConvertTo};
    use scale::{Decode, Encode};

    #[derive(Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    /// Struct representing the signed payload.
    pub struct ProvenPayload {
        pub js_output: Vec<u8>,
        pub js_code_hash: Hash,
        pub js_engine_code_hash: Hash,
        pub contract_code_hash: Hash,
        pub contract_address: AccountId,
        pub block_number: u32,
    }

    #[derive(Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    /// Struct representing the output of a proven execution.
    pub struct ProvenOutput {
        pub payload: ProvenPayload,
        pub signature: Vec<u8>,
        pub signing_pubkey: Vec<u8>,
    }

    #[ink(storage)]
    pub struct Proven {}

    impl Proven {
        #[ink(constructor)]
        pub fn default() -> Self {
            Self {}
        }

        #[ink(message)]
        /// Returns the public key.
        pub fn pubkey(&self) -> Vec<u8> {
            pink::ext().get_public_key(SigType::Sr25519, &self.key())
        }

        #[ink(message)]
        /// Executes the provided JavaScript code and returns the execution result and the hash of the code.
        /// The output is signed with dedicated private key.
        pub fn prove_output(
            &self,
            js_code: String,
            args: Vec<String>,
        ) -> Result<ProvenOutput, String> {
            let js_code_hash = self
                .env()
                .hash_bytes::<ink::env::hash::Blake2x256>(js_code.as_bytes())
                .into();
            let code_hash_str = hex::encode(js_code_hash);
            let caller = hex::encode(self.env().caller());
            let address = hex::encode(self.env().account_id());
            let block_number = self.env().block_number();
            let block_time = self.env().block_timestamp();
            let final_js_code = alloc::format!(
                r#"globalThis.env = {{
                       jsCodeHash: "0x{code_hash_str}",
                       caller: "0x{caller}",
                       address: "0x{address}",
                       blockNumber: {block_number},
                       blockTimestamp: {block_time},
                   }};
                {js_code}
                "#
            );
            drop(js_code); // Drop the original js_code to save memory
            let output = phat_js::eval(&final_js_code, &args)?;
            let js_output = match output {
                phat_js::Output::String(s) => s.into_bytes(),
                phat_js::Output::Bytes(b) => b,
            };
            let key = self.key();
            let js_delegate = SystemRef::instance()
                .get_driver("JsDelegate".into())
                .expect("Failed to get JsDelegate driver");
            let payload = ProvenPayload {
                js_output,
                js_code_hash,
                js_engine_code_hash: js_delegate.convert_to(),
                contract_code_hash: self
                    .env()
                    .own_code_hash()
                    .expect("Failed to get contract code hash"),
                contract_address: self.env().account_id(),
                block_number: self.env().block_number(),
            };
            let signature = pink::ext().sign(SigType::Sr25519, &key, &payload.encode());
            Ok(ProvenOutput {
                payload,
                signature,
                signing_pubkey: self.pubkey(),
            })
        }

        #[ink(message)]
        /// Same as prove_output except getting the code from given URL.
        pub fn prove_output2(
            &self,
            code_url: String,
            args: Vec<String>,
        ) -> Result<ProvenOutput, String> {
            let response = pink::http_get!(
                code_url,
                alloc::vec![("User-Agent".into(), "phat-contract".into())]
            );
            if (response.status_code / 100) != 2 {
                return Err("Failed to get code".into());
            }
            let js_code = String::from_utf8(response.body).map_err(|_| "Invalid code")?;
            self.prove_output(js_code, args)
        }
    }

    impl Proven {
        /// Returns the key used to sign the execution result.
        fn key(&self) -> Vec<u8> {
            pink::ext().derive_sr25519_key(b"signer"[..].into())
        }
    }
}
