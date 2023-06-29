const ethers = require("ethers");

var fs = require('fs');
const Addresses = require('../../core_scripts/config/addresses.json');
var data = fs.readFileSync(__dirname + "/abi/PcnVault.json", 'utf-8');
const pcnVaultabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/TradeJoeLBRouter.json", 'utf-8');
const Routerabi = JSON.parse(data);
data = fs.readFileSync(__dirname + "/abi/TradeJoeLBFactory.json", 'utf-8');
const ExchangeFactoryabi = JSON.parse(data);
data = fs.readFileSync(__dirname + "/abi/BEP20Token.json", 'utf-8');
const busdabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/MasterChef.json", 'utf-8');
const MasterChefabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/TradeJoeLBPair.json", 'utf-8');
const LPPairabi = JSON.parse(data);

data = fs.readFileSync(__dirname + "/abi/NeondexRouter.json", 'utf-8');
const V2Routerabi = JSON.parse(data).abi;
//=========================================================
const ExchangeFactoryAddr = Addresses.TradeJoeLBFactory;
const ExchangeRouterAddr = Addresses.TradeJoeLBRouter;
const ExchangeRouterAddrV2 = Addresses.TradeJoeExchangeRouter;
const masterchefAddr = Addresses.TradeJoemasterchef;
const UsdtAddr = Addresses.TradeJoeUsdt;
const UsdcAddr = Addresses.TradeJoeUsdc;
const {
    readLPInformation,
    writeLPInformation,
    TradeJoeGetFeeFromPairName,
    TradeJoeGetpIdFromPairName,
    TradeJoeGetAddressFromPairName
} = require("./utils/getAddressFn");

const fee_decimal = 2;

async function findPid(exchangeFactory, MasterChef, tokenLp) {
    console.log("tokenLp token", tokenLp);
    var index = 0;
    try {
        const poolLength = await MasterChef.poolLength();
        console.log(ethers.utils.formatEther(String(poolLength)))
        while (1) {

            const poolInfo = await MasterChef.poolInfo(String(index));
            //console.log("poolInfo.lpToken", poolInfo.lpToken);
            console.log(index);
            if (poolInfo.lpToken == tokenLp) {
                console.log("pid:" + String(index));
                break;
            }
            index++;
        }
    } catch (err) {
        //console.log(err);
        console.log("Add ", tokenLp);
        console.log("pid: ", String(index));
        tx = await MasterChef.add(1000, tokenLp, false);
        await tx.wait();
    }
}
//=========================================================
exports.statusGet = async (req) => {
    console.log("calling statusGet V2.1");
    const { platform, pair, method, pool, farm, address1, address2, private_key, rpc_url } = req;
    const { addr1, addr2 } = TradeJoeGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    try {
        console.log("owner address", owner.address);
        const balance0ETH = await provider.getBalance(owner.address);

        const balanceETH = ethers.utils.formatUnits(balance0ETH, 18);
        console.log("balance0ETH", balanceETH);
        var fee = TradeJoeGetFeeFromPairName(pair);
        console.log("fee", fee);
        // dex
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        var binstep = parseInt(ethers.utils.parseUnits(String(fee), fee_decimal));
        console.log("binstep", binstep);
        var LpAddressList = await exchangeFactory.getLBPairInformation(addre1, addre2, binstep);
        var LpAddress = LpAddressList["LBPair"];
        console.log("Pair address", LpAddress);
        //test
        //console.log(LpAddress); tx = await findPid(exchangeFactory, MasterChef, LpAddress); return "";
        //
        const LPPair = new ethers.Contract(LpAddress, LPPairabi, owner);
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
        const exchangeRouterV2 = new ethers.Contract(ExchangeRouterAddrV2, V2Routerabi, owner);
        res["responseData"] = {
            wallet_balance: balanceETH,
            pairAddr: LpAddress,
            address1: addre1,
            address2: addre2,
            pool: {
                pair: req.pair, // CAKE-USDT
                liquidity: "", // pool liquidity
                volume: "", // pool volume
                liquidity_value: "", // my liquidity value
                LPTokens: "" // LP tokens
            },
            farm: {
                pair: req.pair, // CAKE-USDT
                APR: "", // pool liquidity
                LTV: "", // volume 
                deposit_value: "", // my deposit value
                reward_value: "" // my reward value
            }
        }

        if (pool == "1") {
            try {
                //const name = await LPPair.name();
                //const symbol = await LPPair.symbol();
                const activeID = TradeJoeGetpIdFromPairName(pair);
                const decimals = 6;
                const decimal1 = (addre1 == UsdtAddr | addre1 == UsdcAddr) ? 6 : 18;
                const decimal2 = (addre2 == UsdtAddr | addre2 == UsdcAddr) ? 6 : 18;
                const Token1LP = new ethers.Contract(addre1, busdabi, owner);
                const Token2LP = new ethers.Contract(addre2, busdabi, owner);
                const liquidity1Bg = await Token1LP.balanceOf(LpAddress);
                const liquidity2Bg = await Token2LP.balanceOf(LpAddress);
                const liquidity1Bg_value = await Token1LP.balanceOf(owner.address);
                const liquidity2Bg_value = await Token2LP.balanceOf(owner.address);
                var liquidity1 = parseFloat(ethers.utils.formatUnits(String(liquidity1Bg), decimal1));
                var liquidity2 = parseFloat(ethers.utils.formatUnits(String(liquidity2Bg), decimal2));
                var liquidity1_value = parseFloat(ethers.utils.formatUnits(String(liquidity1Bg_value), decimal1));
                var liquidity2_value = parseFloat(ethers.utils.formatUnits(String(liquidity2Bg_value), decimal2));
                console.log("liquidity1_value=" + String(liquidity1_value) + ", liquidity2_value=" + String(liquidity2_value));
                console.log("liquidity1=" + String(liquidity1) + ", liquidity2=" + String(liquidity2));
                var LPToken = await LPPair.balanceOf(owner.address, activeID);
                console.log("LPToken", ethers.utils.formatEther(String(LPToken)));
                var price1 = 1;
                var price2 = 1;
                var isprice1 = 0;
                var isprice2 = 0;
                var deciaml_add = 1;
                try {
                    if (UsdtAddr != addre1 & UsdcAddr != addre1) {
                        price1 = await exchangeRouterV2.getAmountsIn(ethers.utils.parseUnits(String("1"), 18), [UsdtAddr, addre1]);
                        var price = ethers.utils.formatUnits(String(price1[0]), decimals);
                        price1 = parseFloat(price) * deciaml_add;
                        console.log(price1);
                        isprice1 = 1;
                    }
                    else {
                        isprice1 = 1; price1 = 1;
                        liquidity1_value = liquidity1_value * deciaml_add;
                        liquidity1 = liquidity1 * deciaml_add;
                    }
                }
                catch (err) {
                    isprice1 = 0;
                }

                try {
                    if (UsdtAddr != addre2 & UsdcAddr != addre2) {
                        price2 = await exchangeRouterV2.getAmountsIn(ethers.utils.parseUnits(String("1"), decimals), [UsdtAddr, addre2]);
                        console.log(ethers.utils.formatUnits(String(price2[0])));
                        var price = ethers.utils.formatUnits(String(price2[0]), decimals);
                        price2 = parseFloat(price) * deciaml_add;
                        console.log(price2);
                        isprice2 = 1;
                    }
                    else {
                        isprice2 = 1; price2 = 1;
                        liquidity2_value = liquidity2_value * deciaml_add;
                        liquidity2 = liquidity2 * deciaml_add;
                    }
                }
                catch (err) {
                    isprice2 = 0;
                }
                if (isprice1 == 0) { price1 = 0; price2 = price2 * 2; }
                if (isprice2 == 0) { price2 = 0; price1 = price1 * 2; }
                //console.log("liquidity1_value=" + String(liquidity1_value) + ", liquidity2_value=" + String(liquidity2_value));
                //console.log("liquidity1=" + String(liquidity1) + ", liquidity2=" + String(liquidity2));
                console.log("price1=" + String(price1) + ", price2=" + String(price2));
                var liquidity = liquidity1 * price1 + liquidity2 * price2;
                var liquidity_value = liquidity1_value * price1 + liquidity2_value * price2;
                console.log("liquidity=" + String(liquidity) + ",liquidity_value =" + String(liquidity_value));
                res["responseData"]["pool"]["liquidity"] = liquidity;
                res["responseData"]["pool"]["volume"] = "";
                res["responseData"]["pool"]["liquidity_value"] = liquidity_value;
                res["responseData"]["pool"]["LPTokens"] = ethers.utils.formatEther(String(LPToken));
            }
            catch (err) {
                console.log(err)
            }
        }


    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    return res;
};
exports.liquidityAdd = async (req) => {
    console.log("calling liquidityAdd");
    const { platform, pair, method, pool, farm, address1, address2, amount1, amount2, private_key, rpc_url } = req;
    const { addr1, addr2 } = TradeJoeGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolFarmRes["liquidity"], // pool liquidity
            volume: poolFarmRes["volume"], // pool volume
            liquidity_value: poolFarmRes["liquidity_value"] // my liquidity value
        },
        farm: null
    }
    try {
        var decimal1 = 18;
        var decimal2 = 18;
        if (addre1 == UsdtAddr | addre1 == UsdcAddr) decimal1 = 6;
        if (addre2 == UsdtAddr | addre2 == UsdcAddr) decimal2 = 6;
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
        const token1 = new ethers.Contract(addre1, busdabi, owner); //Cake
        tx = await token1.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount1) * 2), decimal1));
        await tx.wait();
        console.log("approve token1");
        const token2 = new ethers.Contract(addre2, busdabi, owner); //SYRUP
        tx = await token2.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount2) * 2), decimal2));
        await tx.wait();
        console.log("approve token2")
        var binstep = parseInt(ethers.utils.parseUnits(String(fee), fee_decimal));
        const activeID = TradeJoeGetpIdFromPairName(pair);
        var idSlippage = 5;

        var binsAmount = 3;
        var deltaIds = [];
        deltaIds.push(-1);
        deltaIds.push(0);
        deltaIds.push(1);
        var distributionX = [];
        distributionX.push(0);
        distributionX.push(1000000000000000 / 2);
        distributionX.push(1000000000000000 / 2);

        var distributionY = [];
        distributionY.push(1000000000000000 / 3 * 2);
        distributionY.push(1000000000000000 / 3);
        distributionY.push(0);

        var params = {
            tokenX: addre1, // Has to be the same as tokenX defined in LBPair contract
            tokenY: addre2, // Has to be the same as tokenY defined in LBPair contract
            binStep: binstep, // Has to point to existing pair
            amountX: ethers.utils.parseUnits(String(amount1), decimal1), // Amount of token X that you want to add to liquidity
            amountY: ethers.utils.parseUnits(String(amount2), decimal2), // Amount of token Y that you want to add to liquidity
            amountXMin: 0, // Defines amount slippage for token X
            amountYMin: 0, // Defines amount slippage for token Y
            activeIdDesired: activeID, // The active bin you want. It may change due to slippage
            idSlippage: idSlippage, // The slippage tolerance in case active bin moves during time it takes to transact
            deltaIds: deltaIds, // The bins you want to add liquidity to. Each value is relative to the active bin ID
            distributionX: distributionX, // The percentage of X you want to add to each bin in deltaIds
            distributionY: distributionY, // The percentage of Y you want to add to each bin in deltaIds
            to: owner.address, // Receiver address
            refundTo: owner.address, // Refund Address
            deadline: "111111111111111111111" // Block timestamp cannot be lower than deadline
        }
        tx = await exchangeRouter.addLiquidity(params);
        await tx.wait();
        res["responseData"]['result'] = tx;
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    //const balance = await LPPair.balanceOf(owner.address);
    return res;
};
exports.liquidityRemove = async (req) => {
    console.log("calling liquidityRemove");
    const { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = TradeJoeGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolFarmRes["liquidity"], // pool liquidity
            volume: poolFarmRes["volume"], // pool volume
            liquidity_value: poolFarmRes["liquidity_value"] // my liquidity value
        },
        farm: null
    }
    try {
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);

        var LpAddress = await exchangeFactory.getPair(addre1, addre2);
        const LPPair = new ethers.Contract(LpAddress, ["function approve(address spender, uint256 amount) public returns (bool)"], owner);
        tx = await LPPair.approve(exchangeRouter.address, ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();

        var binstep = parseInt(ethers.utils.parseUnits(String(fee), fee_decimal));
        const activeID = TradeJoeGetpIdFromPairName(pair);

        var params = {
            tokenX: addre1, // Has to be the same as tokenX defined in LBPair contract
            tokenY: addre2, // Has to be the same as tokenY defined in LBPair contract
            binStep: binstep, // Has to point to existing pair
            amountXMin: 0, // Defines amount slippage for token X
            amountYMin: 0, // Defines amount slippage for token Y
            ids: activeID, // The active bin you want. It may change due to slippage
            amounts: idSlippage, // The slippage tolerance in case active bin moves during time it takes to transact
            to: owner.address, // Receiver address
            deadline: "111111111111111111111" // Block timestamp cannot be lower than deadline
        }
        tx = await exchangeRouter.removeLiquidity(params);
        await tx.wait();
        res["responseData"]['result'] = tx;
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};
exports.farmingDeposit = async (req) => {
    console.log("calling farmingDeposit");
    const { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = TradeJoeGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: null,
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: poolFarmRes["APR"], // 
            LTV: poolFarmRes["LTV"], //  
            deposit_value: poolFarmRes["deposit_value"],
            reward_value: poolFarmRes["reward_value"] //
        }
    }

    try {
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
        var tokenLp = await exchangeFactory.getPair(addre1, addre2);
        console.log("tokenLp token", tokenLp);
        var pid = TradeJoeGetpIdFromPairName(pair);
        console.log("pid:" + String(pid));
        if (pid < 0) {
            console.log("Add ", tokenLp);
            tx = await MasterChef.add(100, tokenLp, false);
            await tx.wait();
            pid = 0;
        }
        const LPPair = new ethers.Contract(tokenLp, ["function approve(address spender, uint256 amount) public returns (bool)"], owner);
        tx = await LPPair.approve(MasterChef.address, ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();
        tx = await MasterChef.deposit(String(pid), ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();
        res["responseData"]['result'] = tx;

        poolFarmRes["deposit_value"] = parseFloat(poolFarmRes["deposit_value"]) + parseFloat(liquidity);
        res["responseData"]["farm"]["deposit_value"] = poolFarmRes["deposit_value"];
        writeLPInformation(path, poolFarmRes);
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};
exports.farmingHarvest = async (req) => {
    console.log("calling farmingHarvest");
    const { platform, pair, method, pool, farm, address1, address2, private_key, rpc_url } = req;
    const { addr1, addr2 } = TradeJoeGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        pool: null,
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: poolFarmRes["APR"], // pool liquidity
            LTV: poolFarmRes["LTV"], // volume 
            deposit_value: poolFarmRes["deposit_value"], // my deposit value
            reward_value: poolFarmRes["reward_value"] // my reward value
        }
    }
    try {
        var pid = TradeJoeGetpIdFromPairName(pair);
        console.log("pid:" + String(pid));
        const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
        tx = await MasterChef.deposit(String(pid), 0);
        await tx.wait();
        //tx['value'] = ethers.utils.parseUnits(String(tx['value']), 18);
        res["responseData"]['result'] = tx;
        res["responseData"]['harvest_value'] = tx['value'].toNumber();//ethers.utils.parseUnits(String(tx['value']), 18);
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};

exports.farmingWithdraw = async (req) => {
    console.log("calling farmingWithdraw");
    const { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = TradeJoeGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: null,
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: poolFarmRes["APR"], // pool liquidity
            LTV: poolFarmRes["LTV"], // volume 
            deposit_value: poolFarmRes["deposit_value"], // my deposit value
            reward_value: poolFarmRes["reward_value"] // my reward value
        }
    }
    try {
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
        var tokenLp = await exchangeFactory.getPair(addre1, addre2);

        console.log("tokenLp token", tokenLp);
        var pid = TradeJoeGetpIdFromPairName(pair);
        console.log("pid:" + String(pid));
        if (pid < 0) {
            console.log("Add ", tokenLp);
            tx = await MasterChef.add(100, tokenLp, false);
            await tx.wait();
            pid = 1;
        }

        tx = await MasterChef.withdraw(String(pid), ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();
        res["responseData"]['result'] = tx;
        poolFarmRes["deposit_value"] = parseFloat(poolFarmRes["deposit_value"]) - parseFloat(liquidity);
        res["responseData"]["farm"]["deposit_value"] = poolFarmRes["deposit_value"];
        writeLPInformation(path, poolFarmRes);
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};