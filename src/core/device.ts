/**
 * Options for WebGPU device initialization.
 */
export interface DeviceOptions {
  /**
   * Power preference hint for the GPU adapter.
   * - `'high-performance'` — prefer discrete GPU (default).
   * - `'low-power'` — prefer integrated GPU.
   */
  powerPreference?: GPUPowerPreference
  /**
   * Required WebGPU features. The device will fail to initialize if any
   * required feature is not supported by the adapter.
   *
   * @example
   * requiredFeatures: ['timestamp-query']
   */
  requiredFeatures?: GPUFeatureName[]
  /**
   * Required WebGPU limits to request from the device.
   */
  requiredLimits?: Record<string, number>
}

/**
 * The initialized WebGPU device context, used throughout the framework.
 */
export interface DeviceContext {
  /** The WebGPU adapter (physical GPU interface). */
  readonly adapter: GPUAdapter
  /** The WebGPU logical device. Use this for all resource creation and queue operations. */
  readonly device: GPUDevice
  /** The adapter's reported info (vendor, architecture, etc.). Null if the browser doesn't support requestAdapterInfo(). */
  readonly adapterInfo: GPUAdapterInfo | null
}

/**
 * Initializes WebGPU and returns a DeviceContext.
 *
 * Throws a descriptive error if WebGPU is not supported or if the requested
 * features/limits are unavailable.
 *
 * @example
 * const ctx = await initDevice()
 * const { device } = ctx
 * // device is now ready for buffer/texture/pipeline creation
 *
 * @example
 * // Requesting timestamp queries for profiling:
 * const ctx = await initDevice({
 *   requiredFeatures: ['timestamp-query'],
 * })
 */
export async function initDevice(options: DeviceOptions = {}): Promise<DeviceContext> {
  if (!navigator.gpu) {
    throw new Error(
      'WebGPU is not supported in this browser. ' +
        'Use Chrome 113+, Edge 113+, or Safari 18+ with WebGPU enabled.'
    )
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: options.powerPreference ?? 'high-performance',
  })

  if (!adapter) {
    throw new Error(
      'Failed to obtain a WebGPU adapter. ' +
        'Your GPU may not support WebGPU, or it may be disabled by browser flags.'
    )
  }

  const requiredFeatures = options.requiredFeatures ?? []
  for (const feature of requiredFeatures) {
    if (!adapter.features.has(feature)) {
      throw new Error(
        `Required WebGPU feature '${feature}' is not supported by this adapter. ` +
          `Supported features: ${[...adapter.features].join(', ')}`
      )
    }
  }

  const device = await adapter.requestDevice({
    requiredFeatures,
    ...(options.requiredLimits !== undefined ? { requiredLimits: options.requiredLimits } : {}),
  })

  device.lost.then((info) => {
    console.error(`WebGPU device lost: "${info.message}" (reason: ${info.reason})`)
  })

  // requestAdapterInfo is available in Chrome 121+ / Safari 18.2+; guard for older browsers.
  const adapterInfo: GPUAdapterInfo | null =
    'requestAdapterInfo' in adapter
      ? await (adapter as GPUAdapter & { requestAdapterInfo(): Promise<GPUAdapterInfo> }).requestAdapterInfo()
      : null

  return { adapter, device, adapterInfo }
}
