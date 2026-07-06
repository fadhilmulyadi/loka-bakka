const fs = require('fs');
const plan = fs.readFileSync('docs/superpowers/plans/2026-07-06-drizzle-neon-migration.md', 'utf-8');

const t6Start = plan.indexOf('### Task 6:');
const t8Start = plan.indexOf('### Task 8:');
const t6t7 = plan.substring(t6Start, t8Start);

const blocks = [...t6t7.matchAll(/```ts\n([\s\S]*?)\n```/g)].map(m => m[1]);

let output = `"use server"

import { db } from "@/lib/db/client"
import { posyandu, kader, ibu, anak, pengukuran, pregnancyProfile, pregnancyVisit } from "@/lib/db/schema"
import { eq, and, desc, asc, inArray, notInArray, gte, count } from "drizzle-orm"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { calculateIMT, getIMTCategory, getIOMTargets } from "@/lib/growth-standards/imt-calc"
import { calcHeightZScore, stuntingLabel } from "@/lib/growth-standards/stunting-calc"

`;

const isImport = (b) => b.includes('import { db }') || b.includes('import { prisma }') || b.includes('import { posyandu');

for (const block of blocks) {
  if (!isImport(block)) {
    output += block + '\n\n';
  }
}

fs.writeFileSync('lib/actions/kader.ts', output);
console.log('Successfully wrote lib/actions/kader.ts');
