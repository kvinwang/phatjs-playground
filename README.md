# Proven

This is a smart contract designed to run on the Phala [Phat Contract](https://phat.phala.network/) platform. It provides a proof of code execution. When a user calls the `prove_output` method and passes in a piece of JavaScript code, the contract executes this code and outputs the execution result and the hash of the code as the result.

## Usage

### Proving Code Execution

To prove the execution of a piece of code, call the `prove_output` method with the JavaScript code as the argument. The contract will execute the code and return the execution result and the hash of the code.

```rust
let result = contract.prove_output(js_code, args, commit_code);
```

### Retrieving the Public Key

To retrieve the public key associated with the contract, call the `pubkey` method.

```rust
let pubkey = contract.pubkey();
```

## Application Scenario

This contract can be used to prove the identity, assets, and behavior records of users on centralized platforms. By providing a proof of code execution, it allows users to verify that certain actions have taken place.

## License

This project is licensed under the [MIT License](LICENSE).
