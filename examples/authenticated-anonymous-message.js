(function(){
    function hex(bytes) {
        return Array.from(bytes, function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('');
    }
    const token = scriptArgs[0];
    const message = scriptArgs[1];
    const authorized_github_accounts = ['kvinwang', 'phatnguyenuit'];
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
    const user = JSON.parse(response.body);
    if (authorized_github_accounts.indexOf(user.login) === -1) {
        throw new Error(`Unauthorized github user ${user.login}`);
    }
    const userFingerPrint = pink.deriveSecret(`${user.login}@github|${thisCodeHash}`);
    const id = hex(pink.hash('sha256', userFingerPrint)).slice(0, 16);
    return `User ${id}: ${message} - ${response.headers.date}`;
}())