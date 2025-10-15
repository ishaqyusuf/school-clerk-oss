"use client";

import { useState } from "react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="md:border-b">
      <div className="md:m-0 z-50 px-6 border-b  h-[70px] flex gap-4 items-center desktop:sticky desktop:top-0 desktop:bg-background sticky md:static top-0 backdrop-filter backdrop-blur-xl md:backdrop-filter md:backdrop-blur-none dark:bg-[#121212] bg-[#fff] bg-opacity-70 desktop:rounded-t-[10px]">
        <div className="md:hidden">
          {/* <MobileMenu
                  value={{
                    ...value,
                  }}
                /> */}
        </div>
        <div className="flex items-center space-x-4 lg:space-x-0">
          <h1 className="font-bold" id="pageTitle"></h1>
        </div>
        <div id="headerTitleSlot" className="flex items-center space-x-1" />
        <div id="headerNav" className="flex items-center space-x-1" />
        <div id="breadCrumb" className="flex items-center space-x-1"></div>
        {/* <OpenSearchButton /> */}

        <div className="flex-1"></div>
        <div className="mx-4 flex gap-4 " id="navRightSlot"></div>
        <div className="inline-flex gap-4" id="actionNav"></div>
        {/* <UserNav /> */}
      </div>
      <div className="dark:bg-muted" id="pageTab"></div>
      <div className="overflow-auto" id="tab"></div>
    </header>
  );
}
