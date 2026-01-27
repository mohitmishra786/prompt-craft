import * as vscode from "vscode";

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private output: vscode.OutputChannel;
  private isEnabled: boolean = false;

  private constructor() {
    this.output = vscode.window.createOutputChannel("Prompt Craft Telemetry");
    this.updateConfig();
    
    // Listen for config changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("promptCraft.telemetry.enabled") || 
          e.affectsConfiguration("telemetry.telemetryLevel")) {
        this.updateConfig();
      }
    });
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private updateConfig() {
    // Check VS Code global setting and extension specific setting
    const globalLevel = vscode.workspace.getConfiguration("telemetry").get<string>("telemetryLevel");
    const extEnabled = vscode.workspace.getConfiguration("promptCraft").get<boolean>("telemetry.enabled", true);
    
    this.isEnabled = extEnabled && (globalLevel !== "off");
  }

  public sendEvent(name: string, properties?: Record<string, string>, measurements?: Record<string, number>) {
    if (!this.isEnabled) return;

    // Sanitize properties just in case
    const safeProps = properties ? JSON.stringify(properties) : "{}";
    
    // In a real app, this would send to Azure App Insights or PostHog
    // For now, we log to a dedicated channel for visibility
    const entry = `[${new Date().toISOString()}] Event: ${name} | Props: ${safeProps} | Measures: ${JSON.stringify(measurements ?? {})}`;
    this.output.appendLine(entry);
  }

  public dispose() {
    this.output.dispose();
  }
}
