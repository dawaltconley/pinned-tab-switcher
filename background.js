let { tabs, windows, webRequest } = browser;

let pinnedTabId;
const pinnedDomains = [ '*://calendar.google.com/calendar/u/0/r*' ];

async function newPinnedTab(details) {
    pinnedTabId = details.tabId;
    await tabs.update(details.tabId, { pinned: true });
    return {};
}

webRequest.onBeforeRequest.addListener(async details => {
    if (pinnedTabId === details.tabId)
        return {};
    if (!pinnedTabId) {
        return newPinnedTab(details);
    } else {
        let pinned = await tabs.get(pinnedTabId).catch(() => null);
        if (!pinned)
            return newPinnedTab(details);
        let updateProperties = { active: true };
        if (details.url !== pinned.url)
            updateProperties.url = details.url;

        let newWindow = windows.update(pinned.windowId, { focused: true });
        let newTab = tabs.update(pinned.id, updateProperties);
        let lastTab = tabs.get(details.tabId).then(({url, id}) => {
            if (url === 'about:newtab')
                return tabs.remove(id);
        });
        await Promise.all([ newWindow, newTab, lastTab ]);

        return { cancel: true };
    }
}, {
    urls: pinnedDomains,
}, [ 'blocking' ]);
