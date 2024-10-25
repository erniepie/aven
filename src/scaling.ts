// sizes above XGA/WXGA are not recommended (see README.md)
// scale down to one of these targets if ComputerTool._scaling_enabled is set

export type Resolution = {
  width: number;
  height: number;
};

const MAX_SCALING_TARGETS: Record<string, Resolution> = {
  XGA: { width: 1024, height: 768 }, // 4:3
  WXGA: { width: 1280, height: 800 }, // 16:10
  FWXGA: { width: 1366, height: 768 }, // ~16:9
};

export enum ScalingSource {
  COMPUTER = "computer",
  API = "api",
}

class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/**
 * Scales coordinates between the actual screen resolution and standardized target resolutions
 * to ensure consistent behavior across different screen sizes.
 *
 * When source is COMPUTER:
 * - Scales down coordinates from actual screen size to closest matching target resolution
 * - Used when receiving coordinates from mouse/screen events
 *
 * When source is API:
 * - Scales up coordinates from target resolution to actual screen size
 * - Used when receiving coordinates from API/tool calls
 *
 * @param screenDimensions The screen dimensions {width, height} to scale from/to
 * @param source Whether coordinates are coming from computer events or API calls
 * @param x The x coordinate to scale
 * @param y The y coordinate to scale
 * @returns Tuple of scaled [x, y] coordinates
 * @throws ToolError if API coordinates are out of bounds
 */
export function scaleCoordinates({
  source,
  screenDimensions,
  x,
  y,
}: {
  source: ScalingSource;
  screenDimensions: { width: number; height: number };
  x: number;
  y: number;
}): [number, number] {
  // Calculate aspect ratio of current screen
  const ratio = screenDimensions.width / screenDimensions.height;
  let targetDimension: Resolution | null = null;

  console.log("ratio", ratio);

  // Find closest matching target resolution with same aspect ratio
  for (const dimension of Object.values(MAX_SCALING_TARGETS)) {
    const dimensionRatio = dimension.width / dimension.height;
    console.log("dimensionRatio", dimensionRatio);
    if (Math.abs(dimensionRatio - ratio) < 0.02) {
      // Allow 2% tolerance
      if (dimension.width < screenDimensions.width) {
        targetDimension = dimension;
        break;
      }
    }
  }

  console.log("targetDimension", targetDimension);

  // If no matching target found, return original coordinates
  if (!targetDimension) {
    return [x, y];
  }

  const xScalingFactor = targetDimension.width / screenDimensions.width;
  const yScalingFactor = targetDimension.height / screenDimensions.height;

  if (source === ScalingSource.API) {
    // Validate coordinates are within bounds
    if (x > screenDimensions.width || y > screenDimensions.height) {
      throw new ToolError(
        `Coordinates (${x}, ${y}) exceed screen bounds of ${screenDimensions.width}x${screenDimensions.height}`
      );
    }
    // Scale up from target resolution to actual screen size
    return [Math.round(x / xScalingFactor), Math.round(y / yScalingFactor)];
  }

  // Scale down from actual screen size to target resolution
  return [Math.round(x * xScalingFactor), Math.round(y * yScalingFactor)];
}
