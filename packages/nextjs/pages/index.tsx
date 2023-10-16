import React from "react";
// import Link from "next/link";
import { CovalentClient } from "@covalenthq/client-sdk";
import type { NextPage } from "next";
import { formatEther } from "viem";
import * as chains from "wagmi/chains";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { MetaHeader } from "~~/components/MetaHeader";
import { TransactionHash } from "~~/components/blockexplorer";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const chains_dict = {
    homestead: "eth-mainnet",
    goerli: "eth-goerli",
    matic: "matic-mainnet",
    gnosis: "gnosis-mainnet",
    bsc: "bsc-mainnet",
    arbitrum: "arbitrum-mainnet",
    optimism: "optimism-mainnet",
    avalanche: "avalanche-mainnet",
    aurora: "aurora-mainnet",
    base: "base-mainnet",
    "base-goerli": "base-testnet",
    "polygon-zkevm": "polygon-zkevm-mainnet",
    "zksync-era": "zksync-mainnet",
  };

  const networks = [
    chains.mainnet,
    chains.goerli,
    chains.polygon,
    chains.gnosis,
    chains.bsc,
    chains.arbitrum,
    chains.optimism,
    chains.avalanche,
    chains.aurora,
    chains.base,
    chains.baseGoerli,
    chains.polygonZkEvm,
    chains.zkSync,
  ];

  // const imp_logs = [
  //   "SafeSetup",
  //   "AddedOwner",
  //   "RemovedOwner",
  //   "ChangedThreshold",
  //   "EnabledModule",
  //   "DisabledModule",
  //   "ChangedGuard",
  //   "AddDelegate",
  //   "SetAllowance",
  //   "SafeReceived",
  // ];

  const [newAddress, setNewAddress] = React.useState("");
  const [selectedNetwork, setSelectedNetwork] = React.useState(chains.goerli);
  const [logNames, setLogNames] = React.useState<any[]>([]);
  const [logTimes, setLogTimes] = React.useState<any[]>([]);
  const [logDatas, setLogDatas] = React.useState<any[]>([]);
  const [logTxHash, setLogTxHash] = React.useState<any[]>([]);

  const ApiServices = async (address: string) => {
    setLogNames([]);
    setLogTimes([]);
    setLogDatas([]);
    setLogTxHash([]);

    const chain: any = chains_dict[selectedNetwork.network];
    console.log(chain, selectedNetwork);

    const client = new CovalentClient(process.env.NEXT_PUBLIC_COVALENT_API_KEY || "undefined");

    const resp1 = await client.TransactionService.getTransactionSummary(chain, address);
    console.log(resp1);

    if (resp1.error || resp1.data.items == null) {
      notification.error(
        <>
          <p>{resp1.error_message}</p>
          <p>Please check the address and network and try again.</p>
        </>,
      );
      return;
    }

    const earliest_tx = resp1.data.items[0].earliest_transaction.tx_hash;

    const resp2 = await client.TransactionService.getTransaction(chain, earliest_tx, {});
    // console.log(resp2);

    const startingBlock = resp2.data.items[0].block_height;

    try {
      for await (const resp of client.BaseService.getLogEventsByAddress(chain, address, {
        startingBlock: startingBlock,
      })) {
        console.log(resp);

        if (!resp) {
          notification.error(
            "No logs found for this address on the selected chain. Please check the address and chain again!",
          );
        }

        if (resp.decoded.name === "SafeSetup") {
          const ownerCount = resp.decoded.params[1].value.length;
          setLogData(
            "Safe Created with " + ownerCount + " Owners and Threshold of " + resp.decoded.params[2].value,
            resp.block_signed_at,
            (resp.decoded.params[1].value as unknown as any[]).map((owner: any) => owner.value),
            resp.tx_hash,
          );
        } else if (resp.decoded.name === "ChangedThreshold") {
          setLogData(
            "Threshold Updated To",
            resp.block_signed_at,
            parseInt(resp.decoded.params[0].value, 10),
            resp.tx_hash,
          );
        } else if (resp.decoded.name === "AddedOwner") {
          setLogData("New Owner Added", resp.block_signed_at, ["0x" + resp.raw_log_data.slice(-40)], resp.tx_hash);
        } else if (resp.decoded.name === "RemovedOwner") {
          setLogData("Owner Removed", resp.block_signed_at, [resp.decoded.params[0].value], resp.tx_hash);
        } else if (resp.decoded.name === "EnabledModule") {
          setLogData("Module Enabled", resp.block_signed_at, [resp.decoded.params[0].value], resp.tx_hash);
        } else if (resp.decoded.name === "DisabledModule") {
          setLogData("Module Disabled", resp.block_signed_at, [resp.decoded.params[0].value], resp.tx_hash);
        } else if (resp.decoded.name === "ChangedGuard") {
          setLogData("Guard Updated", resp.block_signed_at, [resp.decoded.params[0].value], resp.tx_hash);
        } else if (resp.decoded.name === "SafeReceived") {
          setLogData(
            `Received ${selectedNetwork.nativeCurrency.symbol}`,
            resp.block_signed_at,
            parseInt(resp.decoded.params[1].value, 10) + " from " + resp.decoded.params[0].value,
            resp.tx_hash,
          );
        }

        function setLogData(name: string, time: Date, data: any, tx_hash: string) {
          setLogNames(prevLogNames => [...prevLogNames, name]);
          setLogTimes(prevLogTimes => [...prevLogTimes, time.toLocaleString()]);
          setLogDatas(prevLogDatas => [...prevLogDatas, data]);
          setLogTxHash(prevLogTxHash => [...prevLogTxHash, tx_hash]);
        }
      }
    } catch (error: any) {
      console.log(error.message);
    }
  };

  return (
    <>
      <MetaHeader />
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold">AA History & Audit Dashboard</h1>
            <p className="py-8">
              Welcome to the AA History & Audit Dashboard. This dashboard allows you to view the complete history of any
              Safe{"{Wallet}"} address. Simply input the address of the Safe{"{Wallet}"} you want to audit, choose the
              network and click audit.
            </p>
            <div className="flex items-center mb-9">
              <div className="flex-none w-4/6">
                <AddressInput value={newAddress} onChange={setNewAddress} />
              </div>
              <div className="dropdown dropdown-bottom w-2/6 flex-none">
                <label tabIndex={0} className="btn btn-neutral btn-md dropdown-toggle gap-1">
                  <span>{selectedNetwork.name} </span> <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
                </label>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu p-2 mt-1 shadow-center shadow-accent bg-base-200 rounded-box gap-1"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {networks.map((option: any) => (
                    <li key={option.name}>
                      <button
                        className="btn-sm !rounded-xl flex py-3 gap-6"
                        type="button"
                        onClick={() => setSelectedNetwork(option)}
                      >
                        {option.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button className="btn btn-primary w-1/2" onClick={() => ApiServices(newAddress)}>
              Audit
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center px-4 md:px-0">
        <div className="overflow-x-auto w-full shadow-2xl rounded-xl">
          {logNames.length > 0 && (
            <table className="table text-xl bg-base-100 table-zebra w-full md:table-md table-sm">
              <thead>
                <tr className="rounded-xl text-sm text-base-content">
                  <th className="bg-primary">Date & Time</th>
                  <th className="bg-primary">Action</th>
                  <th className="bg-primary">Details</th>
                  <th className="bg-primary">Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {logNames.map((logName, index) => (
                  <tr key={index} className="hover text-sm">
                    <td className="w-1/12 md:py-4">{logTimes[index]}</td>
                    <td className="w-1/12 md:py-4">{logName}</td>
                    <td className="w-1/12 md:py-4">
                      {Array.isArray(logDatas[index]) ? (
                        logDatas[index].map((address: string, i: number) => (
                          <Address key={i} address={address} network={selectedNetwork} format="long" size="sm" />
                        ))
                      ) : typeof logDatas[index] === "string" ? (
                        <>
                          {formatEther(logDatas[index].split(" ")[0])} {selectedNetwork.nativeCurrency.symbol} from{" "}
                          <Address
                            address={logDatas[index].split(" ")[2]}
                            network={selectedNetwork}
                            format="long"
                            size="sm"
                          />
                        </>
                      ) : (
                        logDatas[index]
                      )}
                    </td>
                    <td className="w-1/12 md:py-4">
                      <TransactionHash hash={logTxHash[index]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
