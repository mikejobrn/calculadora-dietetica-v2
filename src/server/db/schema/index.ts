import { pgTable, uuid, text, timestamp, pgEnum, decimal, jsonb } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["admin", "nutricionista"]);
export const productTypeEnum = pgEnum("product_type", [
  "dieta_completa",
  "modulo_proteina",
  "modulo_fibra",
]);

// Perfis (linked to Supabase Auth)
export const perfis = pgTable("perfis", {
  id: uuid("id").defaultRandom().primaryKey(),
  authId: uuid("auth_id").notNull().unique(),
  email: text("email").notNull().unique(),
  nome: text("nome").notNull(),
  papel: roleEnum("papel").notNull().default("nutricionista"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

// Produtos Alimentares
export const produtosAlimentares = pgTable("produtos_alimentares", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  tipo: productTypeEnum("tipo").notNull(),
  densidadeCalorica: decimal("densidade_calorica", { precision: 6, scale: 2 }),
  proteina: decimal("proteina", { precision: 6, scale: 2 }),
  carboidrato: decimal("carboidrato", { precision: 6, scale: 2 }),
  lipidio: decimal("lipidio", { precision: 6, scale: 2 }),
  fibra: decimal("fibra", { precision: 6, scale: 2 }),
  fabricante: text("fabricante"),
  criadoPor: uuid("criado_por").references(() => perfis.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});

// Métodos de Estimativa
export const metodosEstimativa = pgTable("metodos_estimativa", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  referencia: text("referencia"),
  parametros: jsonb("parametros").notNull().default([]),
  formulas: jsonb("formulas").notNull().default({}),
  criadoPor: uuid("criado_por").references(() => perfis.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
});
