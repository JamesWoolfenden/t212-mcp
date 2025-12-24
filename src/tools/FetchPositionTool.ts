import {ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { MCPTool, mapToolResponse } from "./MCPTool.js";
import type {Position} from "../models/Position.js"
import { fetchPosition } from "../api/api.js"

type ArgsType = {
  ticker: z.ZodString
}

// Enhanced validation schema for ticker
const args: ArgsType = {
  ticker: z.string()
    .min(1, "Ticker symbol cannot be empty")
    .max(20, "Ticker symbol is too long")
    .regex(
      /^[A-Z0-9][A-Z0-9.-]*$/i,
      "Ticker must contain only letters, numbers, dots, and hyphens"
    )
    .transform(val => val.trim().toUpperCase()) // Normalize to uppercase
}

const callback: ToolCallback<ArgsType> = async ({ticker}) => {
  try {
    const position: Position | null = await fetchPosition(ticker);

    if (position !== null) {
      const positionsContent = mapToolResponse(position);
    
      return {
        content: positionsContent,
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Could not fetch position for ticker "${ticker}". The ticker may not exist in your portfolio, or there may be a temporary API issue.`
        }
      ]
    }
  } catch (error) {
    console.error(`Error in FetchPositionTool for ticker "${ticker}":`, error);
    
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while fetching position for "${ticker}". Please try again later.`
        }
      ]
    }
  }
}

export const FetchPositionTool: MCPTool<ArgsType> = {
  name: "fetch-position",
  description: "Fetch a specific investment position by ticker symbol (e.g., AAPL, MSFT, VOO). The ticker must be a valid stock or ETF symbol.",
  args: args,
  callBack: callback
}