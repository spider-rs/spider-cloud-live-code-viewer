"use client";
import React from "react";
import { BiSearch } from "react-icons/bi";

const SearchBar = () => {
  return (
    <div className="flex justify-center items-center my-2 place-self-end">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <div className="relative">
        <input
          type="text"
          id="search"
          className="rounded border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter website..."
          aria-label="Search"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <BiSearch />
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
