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