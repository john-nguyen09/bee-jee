import { Router } from 'express';
import WebSocket from 'ws';
import { WebsocketWithBeeJee } from './websocket.interface';
import ConfigManager from './config.interface';

export interface Controller {
  path: string;
  router: Router;
  boot(config: ConfigManager): void;
}

export interface WsController {
  subscribeToWs(context: WsContext): void;
}

export interface WsContext {
  wss: WebSocket.Server,
  ws: WebsocketWithBeeJee,
}

export function isWsController(controller: Controller): controller is Controller & WsController {
  return 'subscribeToWs' in controller;
}
