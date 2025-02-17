import * as i0 from '@angular/core';
import { InjectionToken, EventEmitter, Component, Optional, Inject, ViewChildren, Input, Output, NgModule } from '@angular/core';
import * as i1 from '@angular/common';
import { CommonModule } from '@angular/common';

const CodeInputComponentConfigToken = new InjectionToken('CodeInputComponentConfig');
const defaultComponentConfig = {
    codeLength: 4,
    inputType: 'tel',
    inputMode: 'numeric',
    initialFocusField: undefined,
    isCharsCode: false,
    isCodeHidden: false,
    isPrevFocusableAfterClearing: true,
    isFocusingOnLastByClickIfFilled: false,
    code: undefined,
    disabled: false,
    autocapitalize: undefined
};

var InputState;
(function (InputState) {
    InputState[InputState["ready"] = 0] = "ready";
    InputState[InputState["reset"] = 1] = "reset";
})(InputState || (InputState = {}));
class CodeInputComponent {
    constructor(config) {
        /** @deprecated Use isCharsCode prop instead. */
        this.isNonDigitsCode = false;
        this.codeChanged = new EventEmitter();
        this.codeCompleted = new EventEmitter();
        this.placeholders = [];
        this.inputs = [];
        this.inputsStates = [];
        this.state = {
            isFocusingAfterAppearingCompleted: false,
            isInitialFocusFieldEnabled: false
        };
        Object.assign(this, defaultComponentConfig);
        if (!config) {
            return;
        }
        // filtering for only valid config props
        for (const prop in config) {
            if (!config.hasOwnProperty(prop)) {
                continue;
            }
            if (!defaultComponentConfig.hasOwnProperty(prop)) {
                continue;
            }
            // @ts-ignore
            this[prop] = config[prop];
        }
    }
    /**
     * Life cycle
     */
    ngOnInit() {
        // defining the state
        this.state.isInitialFocusFieldEnabled = !this.isEmpty(this.initialFocusField);
        // initiating the code
        this.onCodeLengthChanges();
    }
    ngAfterViewInit() {
        // initiation of the inputs
        this.inputsListSubscription = this.inputsList.changes.subscribe(this.onInputsListChanges.bind(this));
        this.onInputsListChanges(this.inputsList);
    }
    ngAfterViewChecked() {
        this.focusOnInputAfterAppearing();
    }
    ngOnChanges(changes) {
        if (changes.code) {
            this.onInputCodeChanges();
        }
        if (changes.codeLength) {
            this.onCodeLengthChanges();
        }
    }
    ngOnDestroy() {
        if (this.inputsListSubscription) {
            this.inputsListSubscription.unsubscribe();
        }
    }
    /**
     * Methods
     */
    reset(isChangesEmitting = false) {
        // resetting the code to its initial value or to an empty value
        this.onInputCodeChanges();
        if (this.state.isInitialFocusFieldEnabled) {
            // tslint:disable-next-line:no-non-null-assertion
            this.focusOnField(this.initialFocusField);
        }
        if (isChangesEmitting) {
            this.emitChanges();
        }
    }
    focusOnField(index) {
        if (index >= this._codeLength) {
            throw new Error('The index of the focusing input box should be less than the codeLength.');
        }
        this.inputs[index].focus();
    }
    onClick(e) {
        // handle click events only if the the prop is enabled
        if (!this.isFocusingOnLastByClickIfFilled) {
            return;
        }
        const target = e.target;
        const last = this.inputs[this._codeLength - 1];
        // already focused
        if (target === last) {
            return;
        }
        // check filling
        const isFilled = this.getCurrentFilledCode().length >= this._codeLength;
        if (!isFilled) {
            return;
        }
        // focusing on the last input if is filled
        setTimeout(() => last.focus());
    }
    onInput(e, i) {
        const target = e.target;
        const value = e.data || target.value;
        if (this.isEmpty(value)) {
            return;
        }
        // only digits are allowed if isCharsCode flag is absent/false
        if (!this.canInputValue(value)) {
            e.preventDefault();
            e.stopPropagation();
            this.setInputValue(target, null);
            this.setStateForInput(target, InputState.reset);
            return;
        }
        const values = value.toString().trim().split('');
        for (let j = 0; j < values.length; j++) {
            const index = j + i;
            if (index > this._codeLength - 1) {
                break;
            }
            this.setInputValue(this.inputs[index], values[j]);
        }
        this.emitChanges();
        const next = i + values.length;
        if (next > this._codeLength - 1) {
            target.blur();
            return;
        }
        this.inputs[next].focus();
    }
    onPaste(e, i) {
        e.preventDefault();
        e.stopPropagation();
        const data = e.clipboardData ? e.clipboardData.getData('text').trim() : undefined;
        if (this.isEmpty(data)) {
            return;
        }
        // Convert paste text into iterable
        // tslint:disable-next-line:no-non-null-assertion
        const values = data.split('');
        let valIndex = 0;
        for (let j = i; j < this.inputs.length; j++) {
            // The values end is reached. Loop exit
            if (valIndex === values.length) {
                break;
            }
            const input = this.inputs[j];
            const val = values[valIndex];
            // Cancel the loop when a value cannot be used
            if (!this.canInputValue(val)) {
                this.setInputValue(input, null);
                this.setStateForInput(input, InputState.reset);
                return;
            }
            this.setInputValue(input, val.toString());
            valIndex++;
        }
        this.inputs[i].blur();
        this.emitChanges();
    }
    async onKeydown(e, i) {
        const target = e.target;
        const isTargetEmpty = this.isEmpty(target.value);
        const prev = i - 1;
        // processing only the backspace and delete key events
        const isBackspaceKey = await this.isBackspaceKey(e);
        const isDeleteKey = this.isDeleteKey(e);
        if (!isBackspaceKey && !isDeleteKey) {
            return;
        }
        e.preventDefault();
        this.setInputValue(target, null);
        if (!isTargetEmpty) {
            this.emitChanges();
        }
        // preventing to focusing on the previous field if it does not exist or the delete key has been pressed
        if (prev < 0 || isDeleteKey) {
            return;
        }
        if (isTargetEmpty || this.isPrevFocusableAfterClearing) {
            this.inputs[prev].focus();
        }
    }
    onInputCodeChanges() {
        if (!this.inputs.length) {
            return;
        }
        if (this.isEmpty(this.code)) {
            this.inputs.forEach((input) => {
                this.setInputValue(input, null);
            });
            return;
        }
        // tslint:disable-next-line:no-non-null-assertion
        const chars = this.code.toString().trim().split('');
        // checking if all the values are correct
        let isAllCharsAreAllowed = true;
        for (const char of chars) {
            if (!this.canInputValue(char)) {
                isAllCharsAreAllowed = false;
                break;
            }
        }
        this.inputs.forEach((input, index) => {
            const value = isAllCharsAreAllowed ? chars[index] : null;
            this.setInputValue(input, value);
        });
    }
    onCodeLengthChanges() {
        if (!this.codeLength) {
            return;
        }
        this._codeLength = this.codeLength;
        if (this._codeLength > this.placeholders.length) {
            const numbers = Array(this._codeLength - this.placeholders.length).fill(1);
            this.placeholders.splice(this.placeholders.length - 1, 0, ...numbers);
        }
        else if (this._codeLength < this.placeholders.length) {
            this.placeholders.splice(this._codeLength);
        }
    }
    onInputsListChanges(list) {
        if (list.length > this.inputs.length) {
            const inputsToAdd = list.filter((item, index) => index > this.inputs.length - 1);
            this.inputs.splice(this.inputs.length, 0, ...inputsToAdd.map(item => item.nativeElement));
            const states = Array(inputsToAdd.length).fill(InputState.ready);
            this.inputsStates.splice(this.inputsStates.length, 0, ...states);
        }
        else if (list.length < this.inputs.length) {
            this.inputs.splice(list.length);
            this.inputsStates.splice(list.length);
        }
        // filling the inputs after changing of their count
        this.onInputCodeChanges();
    }
    focusOnInputAfterAppearing() {
        if (!this.state.isInitialFocusFieldEnabled) {
            return;
        }
        if (this.state.isFocusingAfterAppearingCompleted) {
            return;
        }
        // tslint:disable-next-line:no-non-null-assertion
        this.focusOnField(this.initialFocusField);
        // tslint:disable-next-line:no-non-null-assertion
        this.state.isFocusingAfterAppearingCompleted = document.activeElement === this.inputs[this.initialFocusField];
    }
    emitChanges() {
        setTimeout(() => this.emitCode(), 50);
    }
    emitCode() {
        const code = this.getCurrentFilledCode();
        this.codeChanged.emit(code);
        if (code.length >= this._codeLength) {
            this.codeCompleted.emit(code);
        }
    }
    getCurrentFilledCode() {
        let code = '';
        for (const input of this.inputs) {
            if (!this.isEmpty(input.value)) {
                code += input.value;
            }
        }
        return code;
    }
    isBackspaceKey(e) {
        const isBackspace = (e.key && e.key.toLowerCase() === 'backspace') || (e.keyCode && e.keyCode === 8);
        if (isBackspace) {
            return Promise.resolve(true);
        }
        // process only key with placeholder keycode on android devices
        if (!e.keyCode || e.keyCode !== 229) {
            return Promise.resolve(false);
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                const input = e.target;
                const isReset = this.getStateForInput(input) === InputState.reset;
                if (isReset) {
                    this.setStateForInput(input, InputState.ready);
                }
                // if backspace key pressed the caret will have position 0 (for single value field)
                resolve(input.selectionStart === 0 && !isReset);
            });
        });
    }
    isDeleteKey(e) {
        return (e.key && e.key.toLowerCase() === 'delete') || (e.keyCode && e.keyCode === 46);
    }
    setInputValue(input, value) {
        const isEmpty = this.isEmpty(value);
        const valueClassCSS = 'has-value';
        const emptyClassCSS = 'empty';
        if (isEmpty) {
            input.value = '';
            input.classList.remove(valueClassCSS);
            // tslint:disable-next-line:no-non-null-assertion
            input.parentElement.classList.add(emptyClassCSS);
        }
        else {
            input.value = value;
            input.classList.add(valueClassCSS);
            // tslint:disable-next-line:no-non-null-assertion
            input.parentElement.classList.remove(emptyClassCSS);
        }
    }
    canInputValue(value) {
        if (this.isEmpty(value)) {
            return false;
        }
        const isDigitsValue = /^[0-9]+$/.test(value.toString());
        return isDigitsValue || (this.isCharsCode || this.isNonDigitsCode);
    }
    setStateForInput(input, state) {
        const index = this.inputs.indexOf(input);
        if (index < 0) {
            return;
        }
        this.inputsStates[index] = state;
    }
    getStateForInput(input) {
        const index = this.inputs.indexOf(input);
        return this.inputsStates[index];
    }
    isEmpty(value) {
        return value === null || value === undefined || !value.toString().length;
    }
    /** @nocollapse */ static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.2", ngImport: i0, type: CodeInputComponent, deps: [{ token: CodeInputComponentConfigToken, optional: true }], target: i0.ɵɵFactoryTarget.Component }); }
    /** @nocollapse */ static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.0.2", type: CodeInputComponent, selector: "code-input", inputs: { codeLength: "codeLength", inputType: "inputType", inputMode: "inputMode", initialFocusField: "initialFocusField", isNonDigitsCode: "isNonDigitsCode", isCharsCode: "isCharsCode", isCodeHidden: "isCodeHidden", isPrevFocusableAfterClearing: "isPrevFocusableAfterClearing", isFocusingOnLastByClickIfFilled: "isFocusingOnLastByClickIfFilled", code: "code", disabled: "disabled", autocapitalize: "autocapitalize" }, outputs: { codeChanged: "codeChanged", codeCompleted: "codeCompleted" }, viewQueries: [{ propertyName: "inputsList", predicate: ["input"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<span *ngFor=\"let holder of placeholders; index as i\"\n      [class.code-hidden]=\"isCodeHidden\">\n  <input #input\n         (click)=\"onClick($event)\"\n         (paste)=\"onPaste($event, i)\"\n         (input)=\"onInput($event, i)\"\n         (keydown)=\"onKeydown($event, i)\"\n         [type]=\"inputType\"\n         [disabled]=\"disabled\"\n         [attr.inputmode]=\"inputMode\"\n         [attr.autocapitalize]=\"autocapitalize\"\n         autocomplete=\"one-time-code\"/>\n</span>\n", styles: [":host{--text-security-type: disc;--item-spacing: 4px;--item-height: 4.375em;--item-border: 1px solid #dddddd;--item-border-bottom: 1px solid #dddddd;--item-border-has-value: 1px solid #dddddd;--item-border-bottom-has-value: 1px solid #dddddd;--item-border-focused: 1px solid #dddddd;--item-border-bottom-focused: 1px solid #dddddd;--item-shadow-focused: 0px 1px 5px rgba(221, 221, 221, 1);--item-border-radius: 5px;--item-background: transparent;--item-font-weight: 300;--color: #171516;display:flex;transform:translateZ(0);font-size:inherit;color:var(--color)}:host span{display:block;flex:1}:host span:not(:last-child){padding-right:var(--item-spacing)}:host span.code-hidden input{text-security:var(--text-security-type);-webkit-text-security:var(--text-security-type);-moz-text-security:var(--text-security-type)}:host input{width:100%;height:var(--item-height);color:inherit;background:var(--item-background);text-align:center;font-size:inherit;font-weight:var(--item-font-weight);border:var(--item-border);border-bottom:var(--item-border-bottom);border-radius:var(--item-border-radius);-webkit-appearance:none;transform:translateZ(0);-webkit-transform:translate3d(0,0,0);outline:none;box-sizing:border-box}:host input.has-value{border:var(--item-border-has-value);border-bottom:var(--item-border-bottom-has-value)}:host input:focus{background:var(--item-background-focused, transparent);border:var(--item-border-focused);border-bottom:var(--item-border-bottom-focused);box-shadow:var(--item-shadow-focused)}\n"], dependencies: [{ kind: "directive", type: i1.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.2", ngImport: i0, type: CodeInputComponent, decorators: [{
            type: Component,
            args: [{ selector: 'code-input', template: "<span *ngFor=\"let holder of placeholders; index as i\"\n      [class.code-hidden]=\"isCodeHidden\">\n  <input #input\n         (click)=\"onClick($event)\"\n         (paste)=\"onPaste($event, i)\"\n         (input)=\"onInput($event, i)\"\n         (keydown)=\"onKeydown($event, i)\"\n         [type]=\"inputType\"\n         [disabled]=\"disabled\"\n         [attr.inputmode]=\"inputMode\"\n         [attr.autocapitalize]=\"autocapitalize\"\n         autocomplete=\"one-time-code\"/>\n</span>\n", styles: [":host{--text-security-type: disc;--item-spacing: 4px;--item-height: 4.375em;--item-border: 1px solid #dddddd;--item-border-bottom: 1px solid #dddddd;--item-border-has-value: 1px solid #dddddd;--item-border-bottom-has-value: 1px solid #dddddd;--item-border-focused: 1px solid #dddddd;--item-border-bottom-focused: 1px solid #dddddd;--item-shadow-focused: 0px 1px 5px rgba(221, 221, 221, 1);--item-border-radius: 5px;--item-background: transparent;--item-font-weight: 300;--color: #171516;display:flex;transform:translateZ(0);font-size:inherit;color:var(--color)}:host span{display:block;flex:1}:host span:not(:last-child){padding-right:var(--item-spacing)}:host span.code-hidden input{text-security:var(--text-security-type);-webkit-text-security:var(--text-security-type);-moz-text-security:var(--text-security-type)}:host input{width:100%;height:var(--item-height);color:inherit;background:var(--item-background);text-align:center;font-size:inherit;font-weight:var(--item-font-weight);border:var(--item-border);border-bottom:var(--item-border-bottom);border-radius:var(--item-border-radius);-webkit-appearance:none;transform:translateZ(0);-webkit-transform:translate3d(0,0,0);outline:none;box-sizing:border-box}:host input.has-value{border:var(--item-border-has-value);border-bottom:var(--item-border-bottom-has-value)}:host input:focus{background:var(--item-background-focused, transparent);border:var(--item-border-focused);border-bottom:var(--item-border-bottom-focused);box-shadow:var(--item-shadow-focused)}\n"] }]
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [CodeInputComponentConfigToken]
                }] }]; }, propDecorators: { inputsList: [{
                type: ViewChildren,
                args: ['input']
            }], codeLength: [{
                type: Input
            }], inputType: [{
                type: Input
            }], inputMode: [{
                type: Input
            }], initialFocusField: [{
                type: Input
            }], isNonDigitsCode: [{
                type: Input
            }], isCharsCode: [{
                type: Input
            }], isCodeHidden: [{
                type: Input
            }], isPrevFocusableAfterClearing: [{
                type: Input
            }], isFocusingOnLastByClickIfFilled: [{
                type: Input
            }], code: [{
                type: Input
            }], disabled: [{
                type: Input
            }], autocapitalize: [{
                type: Input
            }], codeChanged: [{
                type: Output
            }], codeCompleted: [{
                type: Output
            }] } });

class CodeInputModule {
    static forRoot(config) {
        return {
            ngModule: CodeInputModule,
            providers: [
                { provide: CodeInputComponentConfigToken, useValue: config }
            ]
        };
    }
    /** @nocollapse */ static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.2", ngImport: i0, type: CodeInputModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    /** @nocollapse */ static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "16.0.2", ngImport: i0, type: CodeInputModule, declarations: [CodeInputComponent], imports: [CommonModule], exports: [CodeInputComponent] }); }
    /** @nocollapse */ static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "16.0.2", ngImport: i0, type: CodeInputModule, imports: [CommonModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.2", ngImport: i0, type: CodeInputModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        CommonModule
                    ],
                    declarations: [
                        CodeInputComponent
                    ],
                    exports: [
                        CodeInputComponent
                    ]
                }]
        }] });

/*
 * Public API Surface of code-input
 */

/**
 * Generated bundle index. Do not edit.
 */

export { CodeInputComponent, CodeInputComponentConfigToken, CodeInputModule, defaultComponentConfig };
//# sourceMappingURL=angular-code-input.mjs.map
