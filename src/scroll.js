import View from './view.js'

function scrollTo(card, behavior) {
    behavior ||= "smooth";
    if (card.elem) {
        var cardsContainer = document.getElementById("cards");
        if (View.mode == View.Mode.INPUT) {
            var adjustedHeight = getAdjustedHeight(card)

            cardsContainer.scrollTo({
                top: Math.max(0, card.order
                    * (adjustedHeight + 10)
                    - cardsContainer.getBoundingClientRect().height / 2),
                behavior: behavior,
            });
        } else if (View.mode == View.Mode.ARTVIEW) {
            card.elem.scrollIntoView({
                block: "start",
                behavior: behavior,
            });
        }
    }
}

function getAdjustedHeight(card) {
    var cardRect = card.elem.getBoundingClientRect();
    var cardHeight = cardRect.height;
    var cardWidth = cardRect.width;
    var radians = Math.abs(card.rotation * (Math.PI / 180));

    let sin = Math.sin(radians);
    let cos = Math.cos(radians);

    return (cardWidth * sin - cardHeight * cos)
        / (sin * sin - cos * cos);
};

export { scrollTo };