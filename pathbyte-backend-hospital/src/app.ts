import express from "express";
import expressLoader from "./loaders/expressLoader";
import mongooseLoader from "./loaders/mongooseLoader";

export default async ({ expressApp }: { expressApp: express.Application }) => {
  await mongooseLoader();
  await expressLoader({ app: expressApp });
  return expressApp;
};
