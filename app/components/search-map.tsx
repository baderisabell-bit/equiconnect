"use client";

import dynamic from "next/dynamic";
import React from "react";

const SearchMapClient = dynamic(() => import("./search-map-client"), { ssr: false });

export default function SearchMap(props: any) {
  return <SearchMapClient {...props} />;
}

