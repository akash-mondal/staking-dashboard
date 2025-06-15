import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { getWallets } from '@talisman-connect/wallets';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { LoaderCircle, ShieldCheck, PieChart, Vote, PiggyBank, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { INZO_STAKE_ADDRESS, INZO_STAKE_ABI, INZO_USD_ADDRESS, INZO_USD_ABI } from './constants';
// Note: Governance card is simulated. To make it real, add your InzoPoll ABI/address to constants.js

// --- Animated Number Component (self-contained) ---
function AnimatedNumber({ value, precision = 2 }) {
  const ref = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(prevValue.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        node.textContent = parseFloat(latest).toLocaleString('en-US', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        });
      },
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, precision]);

  return <span ref={ref} />;
}

// --- Network & Simulated Data ---
const CORRECT_CHAIN_ID = 420420421n;
const networkConfig = {
  chainId: ethers.toQuantity(CORRECT_CHAIN_ID),
  chainName: 'Westend Asset Hub',
  nativeCurrency: { name: 'Westend', symbol: 'WND', decimals: 18 },
  rpcUrls: ['https://westend-asset-hub-eth-rpc.polkadot.io/'],
};
const simulatedChartData = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  premium: 4000 + Math.sin(i / 3) * 1500 + Math.random() * 800,
}));


// --- Main App Component ---
function App() {
  const [userAddress, setUserAddress] = useState(null);
  const [inzoStakeContract, setInzoStakeContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });
  const [tvl, setTvl] = useState(0);

  const connectWallet = async () => {
    setLoading(true);
    setStatus({ message: "Connecting...", type: "info" });
    try {
      const talismanWallet = getWallets().find(w => w.extensionName === 'talisman');
      if (!talismanWallet) throw new Error("Talisman wallet not found. Please install it.");
      
      await talismanWallet.enable('Inzo Finance');
      if (!window.talismanEth) throw new Error("Talisman EVM provider not found.");

      let provider = new ethers.BrowserProvider(window.talismanEth);
      let network = await provider.getNetwork();

      if (network.chainId !== CORRECT_CHAIN_ID) {
        setStatus({ message: "Switching network...", type: "info" });
        try {
          await window.talismanEth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: networkConfig.chainId }] });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.talismanEth.request({ method: 'wallet_addEthereumChain', params: [networkConfig] });
          } else { throw new Error("User rejected network switch."); }
        }
        provider = new ethers.BrowserProvider(window.talismanEth);
      }

      const web3Signer = await provider.getSigner();
      const address = await web3Signer.getAddress();

      setUserAddress(address);
      setInzoStakeContract(new ethers.Contract(INZO_STAKE_ADDRESS, INZO_STAKE_ABI, web3Signer));
      setStatus({ message: "", type: "" });
    } catch (error) {
      setStatus({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTVL = async () => {
      if (inzoStakeContract) {
        try {
          const totalStaked = await inzoStakeContract.totalStaked();
          setTvl(parseFloat(ethers.formatUnits(totalStaked, 18)));
        } catch (e) { console.error("Could not fetch TVL"); }
      }
    };
    if (userAddress) fetchTVL();
    const interval = setInterval(fetchTVL, 30000);
    return () => clearInterval(interval);
  }, [userAddress, inzoStakeContract]);

  return (
    <>
      <div className="gradient-bg"></div>
      <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8">
        <AnimatePresence>
          {!userAddress ? (
            <motion.div key="connect-screen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center text-white">
              <h1 className="text-5xl font-bold mb-2">Welcome to Inzo</h1>
              <p className="text-xl text-gray-300 mb-8">The Future of Decentralized Insurance & Staking.</p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={connectWallet} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-colors duration-300 flex items-center justify-center mx-auto text-lg">
                {loading ? <LoaderCircle className="animate-spin mr-2" /> : null}
                Connect Talisman Wallet
              </motion.button>
              {status.message && <p className="mt-4 text-sm text-gray-400">{status.message}</p>}
            </motion.div>
          ) : (
            <motion.div key="dashboard-screen" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full max-w-7xl mx-auto">
              <header className="mb-8 text-white text-center">
                 <h1 className="text-4xl font-bold">Staking Dashboard</h1>
                 <p className="text-sm text-gray-400 break-all mt-1">Connected: {userAddress}</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card title="Protocol Stats" icon={<PieChart/>}>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <h4 className="text-sm text-gray-400 uppercase">TVL</h4>
                      <p className="text-2xl font-bold">$<AnimatedNumber value={tvl} precision={2} /></p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-400 uppercase">Active Policies</h4>
                      <p className="text-2xl font-bold"><AnimatedNumber value={138} precision={0} /></p>
                    </div>
                  </div>
                </Card>

                <StakingCard userAddress={userAddress} />

                <Card title="Your Policy Summary" icon={<ShieldCheck/>}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-gray-300">Active Policies</span><span className="font-bold text-lg">3</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-300">Total Coverage</span><span className="font-bold text-lg">$2,500</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-300">Next Premium Due</span><span className="font-bold text-lg text-amber-300">July 15, 2025</span></div>
                        <motion.button whileHover={{ scale: 1.05 }} className="w-full mt-2 bg-blue-500/50 hover:bg-blue-500/80 text-white font-bold py-2 rounded-lg transition-colors">Manage Policies</motion.button>
                    </div>
                </Card>

                <div className="md:col-span-2 lg:col-span-3">
                    <Card title="Premium Income (Last 30 Days)" icon={<Vote/>}>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%"><LineChart data={simulatedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" /><XAxis dataKey="day" tick={{ fill: 'rgba(255, 255, 255, 0.5)' }} fontSize={12} /><YAxis tick={{ fill: 'rgba(255, 255, 255, 0.5)' }} fontSize={12} /><Tooltip contentStyle={{ backgroundColor: 'rgba(20, 20, 40, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}/><Line type="monotone" dataKey="premium" stroke="#38bdf8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                        </div>
                    </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// --- Reusable Card Component ---
const Card = ({ title, icon, children }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 text-white border border-white/10 shadow-lg h-full">
    <div className="flex items-center text-lg font-bold mb-4 text-gray-200">{icon && <div className="mr-2">{icon}</div>}{title}</div>
    {children}
  </motion.div>
);

// --- Staking Card Component (Fully functional and self-contained) ---
function StakingCard({ userAddress }) {
  const [inzoStakeContract, setInzoStakeContract] = useState(null);
  const [inzoUSDContract, setInzoUSDContract] = useState(null);
  const [inzoUSDBalance, setInzoUSDBalance] = useState(0);
  const [stakedBalance, setStakedBalance] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState(0);
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });

  // Initialize contracts on component mount
  useEffect(() => {
      const init = async () => {
          if (window.talismanEth) {
              const provider = new ethers.BrowserProvider(window.talismanEth);
              const signer = await provider.getSigner();
              setInzoStakeContract(new ethers.Contract(INZO_STAKE_ADDRESS, INZO_STAKE_ABI, signer));
              setInzoUSDContract(new ethers.Contract(INZO_USD_ADDRESS, INZO_USD_ABI, signer));
          }
      };
      init();
  }, []);

  const fetchData = useCallback(async () => {
    if (!userAddress || !inzoStakeContract || !inzoUSDContract) return;
    try {
      const [usdBalance, staked, earned] = await Promise.all([
        inzoUSDContract.balanceOf(userAddress),
        inzoStakeContract.stakedBalance(userAddress),
        inzoStakeContract.earned(userAddress)
      ]);
      setInzoUSDBalance(parseFloat(ethers.formatUnits(usdBalance, 18)));
      setStakedBalance(parseFloat(ethers.formatUnits(staked, 18)));
      setEarnedRewards(parseFloat(ethers.formatUnits(earned, 18)));
    } catch (error) { /* handle error silently */ }
  }, [userAddress, inzoStakeContract, inzoUSDContract]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTx = async (action, amountStr, successMsg) => {
    setLoading(true);
    setStatus({ message: "Preparing transaction...", type: "info" });
    try {
      if(action !== 'claim' && (!amountStr || parseFloat(amountStr) <= 0)) throw new Error("Invalid amount");
      const amount = (action !== 'claim') ? ethers.parseUnits(amountStr, 18) : 0;
      
      if (action === 'stake') {
        setStatus({ message: "Approving...", type: "info" });
        await (await inzoUSDContract.approve(INZO_STAKE_ADDRESS, amount)).wait();
        setStatus({ message: "Staking...", type: "info" });
        await (await inzoStakeContract.stake(amount)).wait();
      } else if (action === 'withdraw') {
        await (await inzoStakeContract.withdraw(amount)).wait();
      } else if (action === 'claim') {
        await (await inzoStakeContract.claimReward()).wait();
      }
      
      setStatus({ message: successMsg, type: "success" });
      setTimeout(() => setStatus({ message: "", type: "" }), 3000);
      setStakeAmount("");
      setWithdrawAmount("");
      await fetchData();
    } catch (error) {
      setStatus({ message: `Failed: ${error.reason || "Check console"}`, type: "error" });
    }
    setLoading(false);
  };
  
  return (
    <Card title="Stake & Earn" icon={<PiggyBank />}>
        <div className="space-y-3 mb-4">
            <div className="flex justify-between items-baseline"><span className="text-gray-300 text-sm">Your Wallet</span><span className="font-semibold text-xl"><AnimatedNumber value={inzoUSDBalance} precision={2} /> InzoUSD</span></div>
            <div className="flex justify-between items-baseline"><span className="text-gray-300 text-sm">Currently Staked</span><span className="font-semibold text-xl"><AnimatedNumber value={stakedBalance} precision={2} /> InzoUSD</span></div>
            <div className="flex justify-between items-baseline bg-green-500/10 p-2 rounded-md"><span className="text-green-300 text-sm">Claimable Rewards</span><span className="font-semibold text-xl text-green-300"><AnimatedNumber value={earnedRewards} precision={6} /> InzoUSD</span></div>
        </div>
        <div className="space-y-2">
            <div className="flex items-center space-x-2"><input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} className="w-full bg-white/20 placeholder-gray-300 text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Amount"/><motion.button onClick={() => handleTx('stake', stakeAmount, 'Staked successfully!')} disabled={!stakeAmount || loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Stake</motion.button></div>
            <div className="flex items-center space-x-2"><input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-white/20 placeholder-gray-300 text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Amount"/><motion.button onClick={() => handleTx('withdraw', withdrawAmount, 'Withdrawn successfully!')} disabled={!withdrawAmount || loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Withdraw</motion.button></div>
            <motion.button onClick={() => handleTx('claim', '0', 'Rewards claimed!')} disabled={earnedRewards <= 0.000001 || loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-3 rounded-md transition-colors mt-2">Claim Rewards</motion.button>
        </div>
        <AnimatePresence>
            {status.message && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`mt-4 text-xs text-center ${status.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>{status.message}</motion.div>
            )}
        </AnimatePresence>
    </Card>
  )
}

export default App;
