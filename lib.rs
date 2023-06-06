#![cfg_attr(not(feature = "std"), no_std, no_main)]
//! This is a smart contract running on the Phala Phat Contract platform.
//! It provides a proof of code execution. When the user calls the `prove_output` method and passes in a piece of JavaScript code,
//! the contract executes this code and outputs the execution result and the hash of the code as the result.
//!
//! Application scenario: It can be used to prove the identity, assets, and behavior records of users on centralized platforms.

extern crate alloc;

#[ink::contract]
mod proven {
    use alloc::string::String;
    use alloc::vec::Vec;
    use pink::chain_extension::SigType;
    use scale::{Decode, Encode};

    #[derive(Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    /// Struct representing the output of a proven execution.
    pub struct ProvenOutput {
        pub code_hash: [u8; 32],
        pub output: Vec<u8>,
        pub signature: Vec<u8>,
    }

    #[ink(storage)]
    /// Main contract struct.
    pub struct Proven {}

    impl Proven {
        #[ink(constructor)]
        /// Default constructor.
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
            submit_code: Option<String>,
        ) -> Result<ProvenOutput, String> {
            let output = phat_js::eval(&js_code, &args)?;
            let output = match output {
                phat_js::Output::String(s) => s.into_bytes(),
                phat_js::Output::Bytes(b) => b,
            };
            let code_hash = self
                .env()
                .hash_bytes::<ink::env::hash::Sha2x256>(js_code.as_bytes());
            let key = self.key();
            let signature =
                pink::ext().sign(SigType::Sr25519, &key, &(code_hash, &output).encode());
            let proven_output = ProvenOutput {
                code_hash,
                output,
                signature,
            };
            if let Some(submit_code) = submit_code {
                let code_hash = hex::encode(&proven_output.code_hash);
                let out = hex::encode(&proven_output.output);
                let sig = hex::encode(&proven_output.signature);
                let args = alloc::vec![code_hash, out, sig];
                let _ = phat_js::eval(&submit_code, &args)?;
            }
            Ok(proven_output)
        }
    }
    impl Proven {
        /// Returns the derived key.
        fn key(&self) -> Vec<u8> {
            pink::ext().derive_sr25519_key(b"signer"[..].into())
        }
    }
}
