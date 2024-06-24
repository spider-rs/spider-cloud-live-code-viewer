import IDE from "./ide"
import TreeView from "./tree-view"
import SearchBar from "./searchbar"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col px-3 py-2">
      <SearchBar />
      <div className="flex gap-2 w-full">
        <TreeView />
        <IDE />
      </div>
    </main>
  );
}
