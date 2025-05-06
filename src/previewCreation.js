import getSettings from './printSettings.js';
//import getDataUrl from './image.js';
import CropMark from './cropmark.js';

class ImageDocumentPreview {
    constructor(options) {
        this.options = options;

        this.cards = [];
    }

    addImage(count, card) {
        this.cards.push({ count, card });
    }

    async create(updateCallback) {
        const ptToPx = 1.333;

        let settings = getSettings(this.options, ptToPx);

        let svg = document.createElement('svg');

        svg.setAttribute('version', '1.1');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', `0 0 ${this.options.pageWidth} ${this.options.pageHeight}`);

        var imgNr = 0;

        let cards = this.cards.flatMap(card => Array(card.count).flatMap(() => card.card.imageUris.map((u, i) => ({ imageUri: u, highResImageUri: card.card.highResImageUris[i] }))));

        var maxStep = cards.length * 5;

        let dataUrl;
        let pageNr = 0;
        let progress = 0;

        updateCallback(0);

        while (imgNr < cards.length) {

            let page = svg.createElement('rect');

            page.setAttribute('stroke', 'black');
            page.setAttribute('width', settings.pageWidth);
            page.setAttribute('height', settings.pageHeight);
            page.setAttribute('y', pageNr * (settings.pageHeight + 16));

            svg.childNodes.push(page);

            for (let y = 0, yPos = settings.marginY; y < settings.yCnt && imgNr < cards.length; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                for (let x = 0, xPos = settings.marginX; x < settings.xCnt && imgNr < cards.length; x++, xPos += settings.mtgWidth + settings.cardMargin, imgNr++) {

                    let card = cards[imgNr];

                    let img = (dataUrl, xPos, yPos, { width: settings.mtgWidth, height: settings.mtgHeight });

                    img.setAttribute('x', xPos);
                    img.setAttribute('y', yPos);
                    img.setAttribute('width', settings.mtgWidth);
                    img.setAttribute('height', settings.mtgHeight);
                    img.setAttribute('href', card.imageUri);

                    //getDataUrl(card.highResImageUri).then(dataUrl => { img.setAttribute('href', dataUrl); });

                    page.appendChild(img);

                    progress++;
                    updateCallback(progress / maxStep);
                }
            }

            let cl_2 = settings.cropMarkSize / 2;

            if (settings.cropMarkShape != CropMark.NONE)
                for (let y = 0, yPos = settings.marginY; y <= settings.yCnt; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                    for (let x = 0, xPos = settings.marginX; x <= settings.xCnt; x++, xPos += settings.mtgWidth + settings.cardMargin) {
                        {
                            switch (settings.cropMarkShape) {
                                case CropMark.STAR:
                                    {
                                        let inset = cl_2 * .9;
                                        let insetO = cl_2 - inset;

                                        let star = svg.createElement('path');
                                        star.setAttribute('stroke-width', '0');
                                        star.setAttribute('fill', settings.cropMarkColor);
                                        star.setAttribute('d', `M ${xPos - cl_2},${yPos} `
                                            + `c ${inset},${insetO} ${inset},${insetO} ${cl_2},${cl_2} `
                                            + `c ${insetO},-${inset} ${insetO},-${inset} ${cl_2},-${cl_2} `
                                            + `c -${inset},-${insetO} -${inset},-${insetO} -${cl_2},-${cl_2} `
                                            + `c -${insetO},${inset} -${insetO},${inset} -${cl_2},${cl_2}`);

                                        page.appendChild(star);
                                    }
                                    break;
                                case CropMark.LINES:
                                default:
                                    {
                                        let line = svg.createElement('path');

                                        line.setAttribute('stroke-width', settings.cropMarkWidth);
                                        line.setAttribute('stroke', settings.cropMarkColor);
                                        line.setAttribute('stroke-linecap', 'round');
                                        line.setAttribute('fill', 'transparent');
                                        line.setAttribute('d', `M${xPos},${yPos - cl_2} v${settings.cropMarkSize} M${xPos - cl_2},${yPos} h${settings.cropMarkSize}`);

                                        page.appendChild(line);
                                    }
                                    break;
                            }
                        }
                    }
                }

            pageNr++;
        }
        return svg;
    }
}

export default ImageDocumentPreview;
export { ImageDocumentPreview };