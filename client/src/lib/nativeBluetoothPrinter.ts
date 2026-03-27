/**
 * Native Bluetooth Printer bridge for Capacitor Android.
 *
 * On native → calls the custom BluetoothPrinterPlugin (RFCOMM, auto-reconnect).
 * On web   → falls back to the existing Web Bluetooth BluetoothPrinter class.
 *
 * The interface mirrors the existing BluetoothPrinter API so PrinterContext
 * can swap seamlessly.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

// ── Native plugin types ──────────────────────────────────────────────────────

export interface PairedDevice {
  name: string;
  address: string;
  type: number;
  bonded?: boolean;
}

interface BluetoothPrinterPluginDef {
  listPairedDevices(): Promise<{ devices: PairedDevice[] }>;
  startDiscovery(): Promise<{ devices: PairedDevice[] }>;
  stopDiscovery(): Promise<void>;
  pairDevice(opts: { address: string }): Promise<{ paired: boolean; address: string; name?: string }>;
  openBluetoothSettings(): Promise<void>;
  connect(opts: { address: string }): Promise<{ connected: boolean; address: string; name?: string }>;
  disconnect(): Promise<void>;
  write(opts: { data: string }): Promise<void>; // base64
  isConnected(): Promise<{ connected: boolean; address: string | null }>;
  getLastConnectedDevice(): Promise<{ address: string | null; name: string | null }>;
  enableAutoReconnect(): Promise<void>;
  disableAutoReconnect(): Promise<void>;
  autoConnect(): Promise<{ connected: boolean; address?: string; name?: string; reason?: string }>;
  addListener(event: string, handler: (data: any) => void): Promise<{ remove: () => void }>;
}

const NativePlugin = registerPlugin<BluetoothPrinterPluginDef>("BluetoothPrinter");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Uint8Array → base64 string for the native bridge. */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isNativeBluetoothAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** List paired Bluetooth devices (native only). */
export async function listPairedDevices(): Promise<PairedDevice[]> {
  const result = await NativePlugin.listPairedDevices();
  return result.devices ?? [];
}

/** Start scanning for nearby Bluetooth devices (native only). */
export async function startDiscovery(): Promise<PairedDevice[]> {
  const result = await NativePlugin.startDiscovery();
  return result.devices ?? [];
}

/** Stop scanning (native only). */
export async function stopDiscovery(): Promise<void> {
  return NativePlugin.stopDiscovery();
}

/** Initiate pairing with a device by MAC address (native only). */
export async function pairDevice(address: string): Promise<{ paired: boolean; address: string; name?: string }> {
  return NativePlugin.pairDevice({ address });
}

/** Open Android Bluetooth settings. */
export async function openBluetoothSettings(): Promise<void> {
  return NativePlugin.openBluetoothSettings();
}

/** Connect to a printer by MAC address. */
export async function connectToPrinter(address: string): Promise<{ connected: boolean; address: string; name?: string }> {
  return NativePlugin.connect({ address });
}

/** Disconnect the current printer. */
export async function disconnectPrinter(): Promise<void> {
  return NativePlugin.disconnect();
}

/** Send raw ESC/POS bytes to the printer. */
export async function writeToPrinter(data: Uint8Array): Promise<void> {
  const b64 = uint8ToBase64(data);
  return NativePlugin.write({ data: b64 });
}

/** Check if a printer is currently connected. */
export async function isPrinterConnected(): Promise<{ connected: boolean; address: string | null }> {
  return NativePlugin.isConnected();
}

/** Get the last connected device info. */
export async function getLastConnectedDevice(): Promise<{ address: string | null; name: string | null }> {
  return NativePlugin.getLastConnectedDevice();
}

/** Enable auto-reconnect (runs in native background). */
export async function enableAutoReconnect(): Promise<void> {
  return NativePlugin.enableAutoReconnect();
}

/** Disable auto-reconnect. */
export async function disableAutoReconnect(): Promise<void> {
  return NativePlugin.disableAutoReconnect();
}

/** Attempt to auto-connect to the last known printer. */
export async function autoConnect(): Promise<{ connected: boolean; address?: string; name?: string; reason?: string }> {
  return NativePlugin.autoConnect();
}

/** Listen for printer connection state changes. */
export function onPrinterConnected(handler: (data: { connected: boolean; address: string; name?: string }) => void): Promise<{ remove: () => void }> {
  return NativePlugin.addListener("printerConnected", handler);
}

export function onPrinterDisconnected(handler: () => void): Promise<{ remove: () => void }> {
  return NativePlugin.addListener("printerDisconnected", handler);
}

/** Listen for devices found during discovery. */
export function onDeviceFound(handler: (data: PairedDevice) => void): Promise<{ remove: () => void }> {
  return NativePlugin.addListener("deviceFound", handler);
}
