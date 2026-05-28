import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import tagname from '@/lib/tagname.json'; // using alias or relative path

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// In app/api/something/route.js or server component
export async function getTagname() {
  return Response.json(tagname);
}
