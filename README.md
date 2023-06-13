# Proven

This is a smart contract designed to run on the Phala [Phat Contract](https://phat.phala.network/) platform. It provides a proof of code execution. When a user calls the `prove_output` method and passes in a piece of JavaScript code, the contract executes this code and outputs the execution result and the hash of the code as the result.

## Usage

### Proving Code Execution

To prove the execution of a piece of code, call the `prove_output` method with the JavaScript code as the argument. The contract will execute the code and return the execution result and the hash of the code.

```rust
let js_code = r#"
(function(){
    const token = scriptArgs[0];
    const message = scriptArgs[1];
    const response = pink.httpRequest({
        url: 'https://api.github.com/user',
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + token,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Phat-Script',
        },
        method: 'GET',
        returnTextBody: true,
    });
    const json = JSON.parse(response.body);
    return `Proven owned github user ${json.login}, date: ${response.headers.date}, message: ${message}`;
}())
"#;

let ProvenOutput {
    payload,
    signature,
    signer_pubkey,
} = contract.prove_output(js_code, vec!["<Your Github Access Token>".into(), "Moon".into()]).unwrap();

let pubkey = contract.pubkey();
assert!(sr25519::verify(&pubkey, &signature, &payload.encode()).is_ok());
```

## Application Scenario

This contract can be used to prove the identity, assets, and behavior records of users on centralized platforms. By providing a proof of code execution, it allows users to verify that certain actions have taken place.

## License

This project is licensed under the [MIT License](LICENSE).
