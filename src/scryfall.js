import Events from "./events.js";

async function delayScryfallCall() {
    if (delayScryfallCall.lastCall) {
        const now = Date.now();
        const timeSinceLastCall = now - delayScryfallCall.lastCall;
        if (timeSinceLastCall < 100) {
            await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastCall));
        }
    }
    delayScryfallCall.lastCall = Date.now();
}

let popupWindow;
let timer;

class Scryfall {
    static async get(cardId, set, nr) {
        let url;

        if (cardId) {
            url = `https://api.scryfall.com/cards/${cardId}`;
            let cachedItem = localStorage.getItem(`card_` + cardId);
            if (cachedItem) {
                const cachedData = JSON.parse(cachedItem);
                set = cachedData.set;
                nr = cachedData.nr;
            }
        }

        if (nr) {
            url = `https://api.scryfall.com/cards/${set}/${nr}`;
            const cacheKey = `card_${set}_${nr}`;
            const cachedCard = localStorage.getItem(cacheKey);

            if (cachedCard) {
                const cachedData = JSON.parse(cachedCard);
                return cachedData.data;
            }
        }

        await delayScryfallCall();
        const response = await fetch(url);
        if (response.status == 200) {
            const data = await response.json();
            const cacheKey = `card_${data.set.toUpperCase()}_${data.collector_number}`;
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
            localStorage.setItem(`card_` + data.id, JSON.stringify({ timestamp: Date.now(), set: data.set.toUpperCase(), nr: data.collector_number }));
            return data;
        }
        return null;
    }

    static async search(name, set) {

        let url = set ? `https://api.scryfall.com/cards/search?order=name&q=${encodeURIComponent(`!"${name}" (set:${set} or set:t${set}) -is:art_series`)}&include_extras=true` :
            `https://api.scryfall.com/cards/search?order=name&q=${encodeURIComponent(`!"${name}" -is:art_series`)}&include_extras=true`;

        const cacheSearchKey = set ? `card_${name}_${set}` : `card_${name}`;
        const cachedCard = localStorage.getItem(cacheSearchKey);

        if (cachedCard) {
            const cachedData = JSON.parse(cachedCard);
            let card = await Scryfall.get(null, cachedData.set, cachedData.nr);
            card.isUndefined = cachedData.isUndefined;
            return card;
        }

        await delayScryfallCall();

        let response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            if (data.total_cards < 1) {
                console.log(data);
                return;
            }

            let card = data.data[0];

            card.isUndefined = data.total_cards > 1;

            localStorage.setItem(cacheSearchKey, JSON.stringify({ timestamp: Date.now(), set: card.set, nr: card.collector_number, isUndefined: card.isUndefined }));
            localStorage.setItem(`card_${card.set.toUpperCase()}_${card.collector_number}`, JSON.stringify({ timestamp: Date.now(), data: data.data[0] }));

            return card;
        }
        return null;
    }

    static open(evt, searchOptions, position, card) {
        var searchParameter = "";

        if (searchOptions.isExtendedArt && searchOptions.isFullArt)
            searchParameter += " (is:extendedart or is:full)";
        else if (searchOptions.isExtendedArt)
            searchParameter += " is:extendedart";
        else if (searchOptions.isFullArt)
            searchParameter += " is:full";

        if (searchOptions.frames.length) {
            if (searchOptions.frames.length == 1)
                searchParameter += " frame:" + searchOptions.frames[0];
            else
                searchParameter += ` (${searchOptions.frames.map(f => `frame:${f}`).join(' or ')})`;
        }

        var src = card.isUndefined ?
            `https://scryfall.com/search?order=name&q=${encodeURIComponent(`!"${card.searchName}" -is:art_series`)}&include_extras=true` :
            `https://scryfall.com/search?q=oracleid%3A${card.oracleId}`;

        src += encodeURIComponent(searchParameter) + "&unique=prints&as=grid&order=released";

        clearInterval(timer);
        if (popupWindow && !popupWindow.closed) {
            popupWindow.location = src;
            popupWindow.focus();
        } else {
            var dx = evt.screenX - evt.clientX;
            var dy = evt.screenY - evt.clientY;

            popupWindow = window.open(src, "_blank", `popup=true,` +
                `width=${position.width},` +
                `height=${position.height},` +
                `left=${position.left + dx},` +
                `top=${position.top + dy}`);
        }

        timer = setInterval(function () {
            if (popupWindow.closed) {
                clearInterval(timer);
                Events.dispatch(Events.Type.ScryfallClosed);
            }
        }, 500);

        Events.dispatch(Events.Type.ScryfallOpened, popupWindow);
    }

    static focusPopupWindow() { popupWindow?.focus(); }
}

export default Scryfall;
export { Scryfall };