"use client";

import { useAtom } from "jotai";
import React from "react";
import { isLoadingAtom, displayedTextAtom } from "~/atoms/ChatAtom";
import Spinner from "./Spinner";

export default function ChatterBox() {
  const [displayedText] = useAtom(displayedTextAtom);
  const [isLoading] = useAtom(isLoadingAtom);

  if (!displayedText && !isLoading) {
    return null;
  }

  return (
    <div className="absolute top-7 flex flex-col-reverse items-center">
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="flex max-w-3xl justify-center border-[3px] rounded-[14px] bg-white p-4 shadow">
          <span className="overflow-hidden text-center font-medium">
            {displayedText}
          </span>
        </div>
      )}
    </div>
  );
}