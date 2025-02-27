import { InjectionToken } from '@angular/core';
export declare const CodeInputComponentConfigToken: InjectionToken<CodeInputComponentConfig>;
export interface CodeInputComponentConfig {
    codeLength?: number;
    inputType?: string;
    inputMode?: string;
    initialFocusField?: number;
    isCharsCode?: boolean;
    isCodeHidden?: boolean;
    isPrevFocusableAfterClearing?: boolean;
    isFocusingOnLastByClickIfFilled?: boolean;
    code?: string | number;
    disabled?: boolean;
    autocapitalize?: string;
}
export declare const defaultComponentConfig: CodeInputComponentConfig;
