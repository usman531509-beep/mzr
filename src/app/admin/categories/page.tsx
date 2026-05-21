import { loadTree } from "@/lib/category-tree";
import { CategoriesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const tree = await loadTree();
  return <CategoriesClient initial={tree} />;
}
