function githubApiGet(url, token) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Phat-Witness',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = pink.httpRequest({
        url,
        headers,
        method: 'GET',
        returnTextBody: true,
    });
    if (response.statusCode !== 200) {
        throw new Error(`Bad status code: ${response.statusCode}`);
    }
    return {
        date: response.headers.date,
        body: JSON.parse(response.body),
    };
}

(function(){
    const token = scriptArgs[0];
    const message = scriptArgs[1];
    const { date, body: user } = githubApiGet('https://api.github.com/user', token);
    return `GitHub user ${user.login}, date: ${date}, message: ${message}`;
}())