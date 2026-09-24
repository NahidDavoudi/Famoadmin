/* Admin static deployment config. Load this before any other page scripts. */
const APP_CONFIG = (function () {
    const host = window.location.hostname;
    const isDev = host === 'localhost' || host === '127.0.0.1';
    return {
        assetUrl: isDev ? '../shared' : 'https://assets.famoacademy.ir',
        apiUrl: isDev ? 'http://localhost:8080/api/v1' : 'https://api.famoacademy.ir/api/v1',
    };
})();

window.APP_CONFIG = Object.assign(window.APP_CONFIG || {}, APP_CONFIG);
window.FAMO_ASSET = function (path) {
    return APP_CONFIG.assetUrl.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');
};

var script = document.currentScript;
var assets = script && script.getAttribute('data-assets');
if (assets) {
    var base = APP_CONFIG.assetUrl.replace(/\/$/, '');
    var tags = assets.split(',').map(function (item) {
        item = item.trim();
        if (!item) return '';
        var url = base + '/' + item.replace(/^\//, '');
        return /\.css$/.test(item)
            ? '<link rel="stylesheet" href="' + url + '">'
            : '<script src="' + url + '"><\\/script>';
    }).filter(Boolean);
    document.write(tags.join(''));
}
