var cost = {};
cost["0"] = document.getElementById("cost0");
cost["1"] = document.getElementById("cost1");
cost["2"] = document.getElementById("cost2");
cost["3"] = document.getElementById("cost3");
cost["4"] = document.getElementById("cost4");
cost["5"] = document.getElementById("cost5");
cost["6"] = document.getElementById("cost6");
cost["7"] = document.getElementById("cost7");
cost["8"] = document.getElementById("cost8");
cost["9"] = document.getElementById("cost9");
cost["10"] = document.getElementById("cost10");
cost["11"] = document.getElementById("cost11");
cost["12"] = document.getElementById("cost12");
cost["13"] = document.getElementById("cost13");
cost["14"] = document.getElementById("cost14");
cost["15"] = document.getElementById("cost15");
cost["16"] = document.getElementById("cost16");
cost["17"] = document.getElementById("cost17");
cost["18"] = document.getElementById("cost18");
cost["19"] = document.getElementById("cost19");
cost["20"] = document.getElementById("cost20");
cost["x"] = document.getElementById("costX");
cost["y"] = document.getElementById("costY");
cost["z"] = document.getElementById("costZ");
cost["w"] = document.getElementById("costW");
cost["u"] = document.getElementById("costU");
cost["b"] = document.getElementById("costB");
cost["r"] = document.getElementById("costR");
cost["g"] = document.getElementById("costG");
cost["s"] = document.getElementById("costSnow");
cost["w/b"] = document.getElementById("costWU");
cost["w/b"] = document.getElementById("costWB");
cost["u/b"] = document.getElementById("costUB");
cost["u/r"] = document.getElementById("costUR");
cost["b/r"] = document.getElementById("costBR");
cost["b/g"] = document.getElementById("costBG");
cost["r/w"] = document.getElementById("costRW");
cost["r/g"] = document.getElementById("costRG");
cost["g/w"] = document.getElementById("costGW");
cost["g/u"] = document.getElementById("costGU");
cost["2w"] = document.getElementById("cost2W");
cost["2u"] = document.getElementById("cost2U");
cost["2b"] = document.getElementById("cost2B");
cost["2r"] = document.getElementById("cost2R");
cost["2g"] = document.getElementById("cost2G");
cost["c/p"] = document.getElementById("costPC");
cost["w/p"] = document.getElementById("costPW");
cost["u/p"] = document.getElementById("costPU");
cost["b/p"] = document.getElementById("costPB");
cost["r/p"] = document.getElementById("costPR");
cost["g/p"] = document.getElementById("costPG");
cost["tap"] = document.getElementById("costTap");
cost["untap"] = document.getElementById("costUntap");
cost["inf"] = document.getElementById("costInf");
cost["half"] = document.getElementById("costHalf");
cost["tapold1"] = document.getElementById("costTapOld1");
cost["tapold2"] = document.getElementById("costTapOld2");
cost["wold"] = document.getElementById("costWOld");
cost["c"] = document.getElementById("costC");
cost["wold"] = document.getElementById("costWOld");
cost["wold"] = document.getElementById("costWOld");
cost["1000000"] = document.getElementById("cost1Mil");
cost["100"] = document.getElementById("cost100");
cost["hr"] = document.getElementById("costRHalf");
cost["hw"] = document.getElementById("costWHalf");

class Mana {
    static getMana(text) {
        const result = [];
        if (text) {
            const parts = text.match(/\{([^}]*)\}/g);
            if (parts) {
                for (let part of parts) {
                    part = part.slice(1, -1).toLowerCase();
                    if (cost[part])
                        result.push(cost[part].cloneNode(true));
                    else
                        console.log("missing Mana "+part);
                }
            }
        }
        return result;
    }
}

export default Mana;
export { Mana };