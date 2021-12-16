let { tabs, windows, webRequest } = browser;

let getDomainPath = url => {
    let { origin='', pathname='' } = new URL(url);
    return origin + pathname;
};

async function pinnedTabListener(pinnedMap, details) {
    console.dir({details});
    let domainPath = getDomainPath(details.url);
    let match = pinnedMap[domainPath];
    console.log({match});
    if (!match || match.id === details.tabId)
        return {};

    let newWindow = windows.update(match.windowId, { focused: true });
    let newTab = tabs.update(match.id, { active: true });
    let lastTab = tabs.get(details.tabId).then(({url, id}) => {
        if (url === 'about:newtab')
            return tabs.remove(id);
    });

    await Promise.all([ newWindow, newTab, lastTab ]);

    console.log('UPDATED');
    return { cancel: true };
}

tabs.query({ pinned: true, }).then(pinned => {
    let pinnedMap = {};
    let filterPaths = [];

    const addTab = tab => {
        let domainPath = getDomainPath(tab.url);
        pinnedMap[domainPath] = tab;
        filterPaths.push(domainPath);
        filterPaths.push(domainPath + '?*');
        updateListener(pinnedMap, filterPaths);
    };

    const rmTab = tab => {
        let domainPath = getDomainPath(tab.url);
        delete pinnedMap[domainPath];
        filterPaths = filterPaths.filter(p => p !== domainPath && p !== domainPath + '?*');
        updateListener(pinnedMap, filterPaths);
    };

    const updateListener = (pinned, filters) => {
        webRequest.onBeforeRequest.removeListener(pinnedTabListener);
        webRequest.onBeforeRequest.addListener(pinnedTabListener.bind(null, pinned), {
            urls: filters
        }, ['blocking']);
    };

    for (let tab of pinned) {
        let domainPath = getDomainPath(tab.url);
        if (!pinnedMap[domainPath])
            addTab(tab);
    }

    tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.pinned === true)
            addTab(tab);
        else
            rmTab(tab);
    }, { properties: ['pinned'] });

    webRequest.onBeforeRequest.addListener(pinnedTabListener.bind(null, pinnedMap), {
        urls: filterPaths // TODO: filter pinned tab ids
    }, ['blocking']);
});
