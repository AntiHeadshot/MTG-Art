import CropMark from './cropmark.js';
import getSettings from './printSettings.js';

class ImageDocumentTemplate {

    static create(options) {
        const ptToPx = 1.333;

        let settings = getSettings(options, ptToPx);

        let svg = [];
        svg.push(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`);
        svg.push(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${settings.pageWidth} ${settings.pageHeight}">`);

        svg.push(`<rect fill="white" `
            + `width="${settings.pageWidth}" height="${settings.pageHeight}"></rect>`);
        for (let y = 0, yPos = settings.marginY; y < settings.yCnt; y++, yPos += settings.mtgHeight + settings.cardMargin) {
            for (let x = 0, xPos = settings.marginX; x < settings.xCnt; x++, xPos += settings.mtgWidth + settings.cardMargin) {
                svg.push(`<rect fill="gray" x="${xPos}" y="${yPos}" width="${settings.mtgWidth}" height="${settings.mtgHeight}"></rect>`);
                svg.push(`<rect stroke="red" stroke-width="0.3mm" fill="transparent" rx="${settings.cornerRadius}" x="${xPos}" y="${yPos}" width="${settings.mtgWidth}" height="${settings.mtgHeight}"></rect>`);
            }
        }

        let cl=0;
        if (settings.cropMarkShape == CropMark.LINES)
            cl = settings.cropMarkSize - settings.cropMarkWidth * 0.5;
        else
            cl = settings.cropMarkSize;

        if (settings.cropMarkShape != CropMark.NONE)
            for (let y = 0, yPos = settings.marginY; y <= settings.yCnt; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                for (let x = 0, xPos = settings.marginX; x <= settings.xCnt; x++, xPos += settings.mtgWidth + settings.cardMargin) {
                    {
                        switch (settings.cropMarkShape) {
                            case CropMark.STAR:
                                {
                                    let inset = cl * .9;
                                    let insetO = cl - inset;
                                    svg.push(`<path stroke-width="0" fill="${settings.cropMarkColor}" d="M ${xPos - cl},${yPos} `
                                        + `c ${inset},${insetO} ${inset},${insetO} ${cl},${cl} `
                                        + `c ${insetO},-${inset} ${insetO},-${inset} ${cl},-${cl} `
                                        + `c -${inset},-${insetO} -${inset},-${insetO} -${cl},-${cl} `
                                        + `c -${insetO},${inset} -${insetO},${inset} -${cl},${cl}"></path>`);
                                }
                                break;
                            case CropMark.LINES:
                            default:
                                svg.push(`<path stroke-width="${settings.cropMarkWidth}" stroke="${settings.cropMarkColor}" stroke-linecap="round" fill="transparent" `
                                    + `d="M${xPos},${yPos - cl} v${cl * 2} M${xPos - cl},${yPos} h${cl * 2}"></path>`);
                                break;
                        }
                    }
                }
            }

        svg.push("</svg>");
        return {
            svg: svg.join("\n")
            , corner: { x: (settings.marginX + settings.mtgWidth + .5 * settings.cardMargin) / settings.pageWidth, y: (settings.marginY + settings.mtgHeight + .5 * settings.cardMargin) / settings.pageHeight }
            , scale: (settings.cardMargin + settings.cornerRadius * 4) / settings.pageWidth
        };
    }
}

export { ImageDocumentTemplate };