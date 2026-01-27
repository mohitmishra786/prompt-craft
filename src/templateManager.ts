import * as vscode from 'vscode';

export interface CustomTemplate {
    id: string;
    name: string;
    description: string;
    template: string; // The markdown template with placeholders like {{context}}, {{task}}, etc.
    type: 'error' | 'project';
}

export class TemplateManager {
    private static instance: TemplateManager;
    private templates: CustomTemplate[] = [];

    private constructor() {
        this.loadTemplates();
    }

    public static getInstance(): TemplateManager {
        if (!TemplateManager.instance) {
            TemplateManager.instance = new TemplateManager();
        }
        return TemplateManager.instance;
    }

    private loadTemplates() {
        const config = vscode.workspace.getConfiguration('promptCraft');
        this.templates = config.get<CustomTemplate[]>('customTemplates') || [];
    }

    public getTemplates(type?: 'error' | 'project'): CustomTemplate[] {
        if (type) {
            return this.templates.filter(t => t.type === type);
        }
        return this.templates;
    }

    public async addTemplate(template: Omit<CustomTemplate, 'id'>) {
        const newTemplate = {
            ...template,
            id: Date.now().toString()
        };
        this.templates.push(newTemplate);
        await this.saveTemplates();
    }

    public async deleteTemplate(id: string) {
        this.templates = this.templates.filter(t => t.id !== id);
        await this.saveTemplates();
    }

    private async saveTemplates() {
        const config = vscode.workspace.getConfiguration('promptCraft');
        await config.update('customTemplates', this.templates, vscode.ConfigurationTarget.Global);
    }

    public applyTemplate(templateStr: string, variables: Record<string, string>): string {
        let result = templateStr;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value || '');
        }
        return result;
    }
}
