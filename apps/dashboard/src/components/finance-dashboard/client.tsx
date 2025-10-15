"use client";

import { useEffect } from "react";

import { NumberInput } from "../currency-input";

export default function Client({ data }) {
  useEffect(() => {
    console.log({ data });
  }, [data]);
  return (
    <div>
      {data?.transactions?.map((d) => (
        <div key={d?.type || "other"}>
          <p>{d.type || "Other"}</p>
          <p>
            <NumberInput value={d._sum?.amount} prefix="NGN " />
          </p>
        </div>
      ))}
    </div>
  );
}
