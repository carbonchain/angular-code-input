import { Component, EventEmitter, Inject, Input, Optional, Output, ViewChildren } from '@angular/core';
import { CodeInputComponentConfigToken, defaultComponentConfig } from './code-input.component.config';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
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
export { CodeInputComponent };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1pbnB1dC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9hbmd1bGFyLWNvZGUtaW5wdXQvc3JjL2xpYi9jb2RlLWlucHV0LmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uL2FuZ3VsYXItY29kZS1pbnB1dC9zcmMvbGliL2NvZGUtaW5wdXQuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUdMLFNBQVMsRUFFVCxZQUFZLEVBQ1osTUFBTSxFQUNOLEtBQUssRUFJTCxRQUFRLEVBQ1IsTUFBTSxFQUdOLFlBQVksRUFDYixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBRUwsNkJBQTZCLEVBQzdCLHNCQUFzQixFQUN2QixNQUFNLCtCQUErQixDQUFDOzs7QUFHdkMsSUFBSyxVQUdKO0FBSEQsV0FBSyxVQUFVO0lBQ2IsNkNBQVMsQ0FBQTtJQUNULDZDQUFTLENBQUE7QUFDWCxDQUFDLEVBSEksVUFBVSxLQUFWLFVBQVUsUUFHZDtBQUVELE1BTWEsa0JBQWtCO0lBa0M3QixZQUErRCxNQUFpQztRQTFCaEcsZ0RBQWdEO1FBQ3ZDLG9CQUFlLEdBQUcsS0FBSyxDQUFDO1FBU2QsZ0JBQVcsR0FBRyxJQUFJLFlBQVksRUFBVSxDQUFDO1FBQ3pDLGtCQUFhLEdBQUcsSUFBSSxZQUFZLEVBQVUsQ0FBQztRQUV2RCxpQkFBWSxHQUFhLEVBQUUsQ0FBQztRQUUzQixXQUFNLEdBQXVCLEVBQUUsQ0FBQztRQUNoQyxpQkFBWSxHQUFpQixFQUFFLENBQUM7UUFLaEMsVUFBSyxHQUFHO1lBQ2QsaUNBQWlDLEVBQUUsS0FBSztZQUN4QywwQkFBMEIsRUFBRSxLQUFLO1NBQ2xDLENBQUM7UUFHQSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxPQUFPO1NBQ1I7UUFFRCx3Q0FBd0M7UUFD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QUFDO0lBQzVFLENBQUM7aUlBbGFVLGtCQUFrQixrQkFrQ0csNkJBQTZCO3FIQWxDbEQsa0JBQWtCLDRvQkNuQy9CLCtlQWFBOztTRHNCYSxrQkFBa0I7MkZBQWxCLGtCQUFrQjtrQkFOOUIsU0FBUzsrQkFFRSxZQUFZOzswQkFzQ1QsUUFBUTs7MEJBQUksTUFBTTsyQkFBQyw2QkFBNkI7NENBaEN0QyxVQUFVO3NCQUFoQyxZQUFZO3VCQUFDLE9BQU87Z0JBRVosVUFBVTtzQkFBbEIsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csaUJBQWlCO3NCQUF6QixLQUFLO2dCQUVHLGVBQWU7c0JBQXZCLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLDRCQUE0QjtzQkFBcEMsS0FBSztnQkFDRywrQkFBK0I7c0JBQXZDLEtBQUs7Z0JBQ0csSUFBSTtzQkFBWixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csY0FBYztzQkFBdEIsS0FBSztnQkFFYSxXQUFXO3NCQUE3QixNQUFNO2dCQUNZLGFBQWE7c0JBQS9CLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBBZnRlclZpZXdDaGVja2VkLFxuICBBZnRlclZpZXdJbml0LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIEV2ZW50RW1pdHRlcixcbiAgSW5qZWN0LFxuICBJbnB1dCxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3B0aW9uYWwsXG4gIE91dHB1dCxcbiAgUXVlcnlMaXN0LFxuICBTaW1wbGVDaGFuZ2VzLFxuICBWaWV3Q2hpbGRyZW5cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1xuICBDb2RlSW5wdXRDb21wb25lbnRDb25maWcsXG4gIENvZGVJbnB1dENvbXBvbmVudENvbmZpZ1Rva2VuLFxuICBkZWZhdWx0Q29tcG9uZW50Q29uZmlnXG59IGZyb20gJy4vY29kZS1pbnB1dC5jb21wb25lbnQuY29uZmlnJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ3J4anMnO1xuXG5lbnVtIElucHV0U3RhdGUge1xuICByZWFkeSA9IDAsXG4gIHJlc2V0ID0gMVxufVxuXG5AQ29tcG9uZW50KHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmNvbXBvbmVudC1zZWxlY3RvclxuICBzZWxlY3RvcjogJ2NvZGUtaW5wdXQnLFxuICB0ZW1wbGF0ZVVybDogJ2NvZGUtaW5wdXQuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9jb2RlLWlucHV0LmNvbXBvbmVudC5zY3NzJ11cbn0pXG5leHBvcnQgY2xhc3MgQ29kZUlucHV0Q29tcG9uZW50IGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25Jbml0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgQWZ0ZXJWaWV3Q2hlY2tlZCwgQ29kZUlucHV0Q29tcG9uZW50Q29uZmlnIHtcblxuICBAVmlld0NoaWxkcmVuKCdpbnB1dCcpIGlucHV0c0xpc3QgITogUXVlcnlMaXN0PEVsZW1lbnRSZWY+O1xuXG4gIEBJbnB1dCgpIGNvZGVMZW5ndGggITogbnVtYmVyO1xuICBASW5wdXQoKSBpbnB1dFR5cGUgITogc3RyaW5nO1xuICBASW5wdXQoKSBpbnB1dE1vZGUgITogc3RyaW5nO1xuICBASW5wdXQoKSBpbml0aWFsRm9jdXNGaWVsZD86IG51bWJlcjtcbiAgLyoqIEBkZXByZWNhdGVkIFVzZSBpc0NoYXJzQ29kZSBwcm9wIGluc3RlYWQuICovXG4gIEBJbnB1dCgpIGlzTm9uRGlnaXRzQ29kZSA9IGZhbHNlO1xuICBASW5wdXQoKSBpc0NoYXJzQ29kZSAhOiBib29sZWFuO1xuICBASW5wdXQoKSBpc0NvZGVIaWRkZW4gITogYm9vbGVhbjtcbiAgQElucHV0KCkgaXNQcmV2Rm9jdXNhYmxlQWZ0ZXJDbGVhcmluZyAhOiBib29sZWFuO1xuICBASW5wdXQoKSBpc0ZvY3VzaW5nT25MYXN0QnlDbGlja0lmRmlsbGVkICE6IGJvb2xlYW47XG4gIEBJbnB1dCgpIGNvZGUgPzogc3RyaW5nIHwgbnVtYmVyO1xuICBASW5wdXQoKSBkaXNhYmxlZCAhOiBib29sZWFuO1xuICBASW5wdXQoKSBhdXRvY2FwaXRhbGl6ZSA/OiBzdHJpbmc7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGNvZGVDaGFuZ2VkID0gbmV3IEV2ZW50RW1pdHRlcjxzdHJpbmc+KCk7XG4gIEBPdXRwdXQoKSByZWFkb25seSBjb2RlQ29tcGxldGVkID0gbmV3IEV2ZW50RW1pdHRlcjxzdHJpbmc+KCk7XG5cbiAgcHVibGljIHBsYWNlaG9sZGVyczogbnVtYmVyW10gPSBbXTtcblxuICBwcml2YXRlIGlucHV0czogSFRNTElucHV0RWxlbWVudFtdID0gW107XG4gIHByaXZhdGUgaW5wdXRzU3RhdGVzOiBJbnB1dFN0YXRlW10gPSBbXTtcbiAgcHJpdmF0ZSBpbnB1dHNMaXN0U3Vic2NyaXB0aW9uICE6IFN1YnNjcmlwdGlvbjtcblxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6dmFyaWFibGUtbmFtZVxuICBwcml2YXRlIF9jb2RlTGVuZ3RoICE6IG51bWJlcjtcbiAgcHJpdmF0ZSBzdGF0ZSA9IHtcbiAgICBpc0ZvY3VzaW5nQWZ0ZXJBcHBlYXJpbmdDb21wbGV0ZWQ6IGZhbHNlLFxuICAgIGlzSW5pdGlhbEZvY3VzRmllbGRFbmFibGVkOiBmYWxzZVxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoQ29kZUlucHV0Q29tcG9uZW50Q29uZmlnVG9rZW4pIGNvbmZpZz86IENvZGVJbnB1dENvbXBvbmVudENvbmZpZykge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgZGVmYXVsdENvbXBvbmVudENvbmZpZyk7XG5cbiAgICBpZiAoIWNvbmZpZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGZpbHRlcmluZyBmb3Igb25seSB2YWxpZCBjb25maWcgcHJvcHNcbiAgICBmb3IgKGNvbnN0IHByb3AgaW4gY29uZmlnKSB7XG4gICAgICBpZiAoIWNvbmZpZy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFkZWZhdWx0Q29tcG9uZW50Q29uZmlnLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICB0aGlzW3Byb3BdID0gY29uZmlnW3Byb3BdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBMaWZlIGN5Y2xlXG4gICAqL1xuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIC8vIGRlZmluaW5nIHRoZSBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuaXNJbml0aWFsRm9jdXNGaWVsZEVuYWJsZWQgPSAhdGhpcy5pc0VtcHR5KHRoaXMuaW5pdGlhbEZvY3VzRmllbGQpO1xuICAgIC8vIGluaXRpYXRpbmcgdGhlIGNvZGVcbiAgICB0aGlzLm9uQ29kZUxlbmd0aENoYW5nZXMoKTtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpOiB2b2lkIHtcbiAgICAvLyBpbml0aWF0aW9uIG9mIHRoZSBpbnB1dHNcbiAgICB0aGlzLmlucHV0c0xpc3RTdWJzY3JpcHRpb24gPSB0aGlzLmlucHV0c0xpc3QuY2hhbmdlcy5zdWJzY3JpYmUodGhpcy5vbklucHV0c0xpc3RDaGFuZ2VzLmJpbmQodGhpcykpO1xuICAgIHRoaXMub25JbnB1dHNMaXN0Q2hhbmdlcyh0aGlzLmlucHV0c0xpc3QpO1xuICB9XG5cbiAgbmdBZnRlclZpZXdDaGVja2VkKCk6IHZvaWQge1xuICAgIHRoaXMuZm9jdXNPbklucHV0QWZ0ZXJBcHBlYXJpbmcoKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICBpZiAoY2hhbmdlcy5jb2RlKSB7XG4gICAgICB0aGlzLm9uSW5wdXRDb2RlQ2hhbmdlcygpO1xuICAgIH1cbiAgICBpZiAoY2hhbmdlcy5jb2RlTGVuZ3RoKSB7XG4gICAgICB0aGlzLm9uQ29kZUxlbmd0aENoYW5nZXMoKTtcbiAgICB9XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pbnB1dHNMaXN0U3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmlucHV0c0xpc3RTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kc1xuICAgKi9cblxuICByZXNldChpc0NoYW5nZXNFbWl0dGluZyA9IGZhbHNlKTogdm9pZCB7XG4gICAgLy8gcmVzZXR0aW5nIHRoZSBjb2RlIHRvIGl0cyBpbml0aWFsIHZhbHVlIG9yIHRvIGFuIGVtcHR5IHZhbHVlXG4gICAgdGhpcy5vbklucHV0Q29kZUNoYW5nZXMoKTtcblxuICAgIGlmICh0aGlzLnN0YXRlLmlzSW5pdGlhbEZvY3VzRmllbGRFbmFibGVkKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICB0aGlzLmZvY3VzT25GaWVsZCh0aGlzLmluaXRpYWxGb2N1c0ZpZWxkISk7XG4gICAgfVxuXG4gICAgaWYgKGlzQ2hhbmdlc0VtaXR0aW5nKSB7XG4gICAgICB0aGlzLmVtaXRDaGFuZ2VzKCk7XG4gICAgfVxuICB9XG5cbiAgZm9jdXNPbkZpZWxkKGluZGV4OiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoaW5kZXggPj0gdGhpcy5fY29kZUxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgaW5kZXggb2YgdGhlIGZvY3VzaW5nIGlucHV0IGJveCBzaG91bGQgYmUgbGVzcyB0aGFuIHRoZSBjb2RlTGVuZ3RoLicpO1xuICAgIH1cblxuICAgIHRoaXMuaW5wdXRzW2luZGV4XS5mb2N1cygpO1xuICB9XG5cbiAgb25DbGljayhlOiBhbnkpOiB2b2lkIHtcbiAgICAvLyBoYW5kbGUgY2xpY2sgZXZlbnRzIG9ubHkgaWYgdGhlIHRoZSBwcm9wIGlzIGVuYWJsZWRcbiAgICBpZiAoIXRoaXMuaXNGb2N1c2luZ09uTGFzdEJ5Q2xpY2tJZkZpbGxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgIGNvbnN0IGxhc3QgPSB0aGlzLmlucHV0c1t0aGlzLl9jb2RlTGVuZ3RoIC0gMV07XG4gICAgLy8gYWxyZWFkeSBmb2N1c2VkXG4gICAgaWYgKHRhcmdldCA9PT0gbGFzdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGNoZWNrIGZpbGxpbmdcbiAgICBjb25zdCBpc0ZpbGxlZCA9IHRoaXMuZ2V0Q3VycmVudEZpbGxlZENvZGUoKS5sZW5ndGggPj0gdGhpcy5fY29kZUxlbmd0aDtcbiAgICBpZiAoIWlzRmlsbGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZm9jdXNpbmcgb24gdGhlIGxhc3QgaW5wdXQgaWYgaXMgZmlsbGVkXG4gICAgc2V0VGltZW91dCgoKSA9PiBsYXN0LmZvY3VzKCkpO1xuICB9XG5cbiAgb25JbnB1dChlOiBhbnksIGk6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgIGNvbnN0IHZhbHVlID0gZS5kYXRhIHx8IHRhcmdldC52YWx1ZTtcblxuICAgIGlmICh0aGlzLmlzRW1wdHkodmFsdWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gb25seSBkaWdpdHMgYXJlIGFsbG93ZWQgaWYgaXNDaGFyc0NvZGUgZmxhZyBpcyBhYnNlbnQvZmFsc2VcbiAgICBpZiAoIXRoaXMuY2FuSW5wdXRWYWx1ZSh2YWx1ZSkpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICB0aGlzLnNldElucHV0VmFsdWUodGFyZ2V0LCBudWxsKTtcbiAgICAgIHRoaXMuc2V0U3RhdGVGb3JJbnB1dCh0YXJnZXQsIElucHV0U3RhdGUucmVzZXQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlcyA9IHZhbHVlLnRvU3RyaW5nKCkudHJpbSgpLnNwbGl0KCcnKTtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IHZhbHVlcy5sZW5ndGg7IGorKykge1xuICAgICAgY29uc3QgaW5kZXggPSBqICsgaTtcbiAgICAgIGlmIChpbmRleCA+IHRoaXMuX2NvZGVMZW5ndGggLSAxKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNldElucHV0VmFsdWUodGhpcy5pbnB1dHNbaW5kZXhdLCB2YWx1ZXNbal0pO1xuICAgIH1cbiAgICB0aGlzLmVtaXRDaGFuZ2VzKCk7XG5cbiAgICBjb25zdCBuZXh0ID0gaSArIHZhbHVlcy5sZW5ndGg7XG4gICAgaWYgKG5leHQgPiB0aGlzLl9jb2RlTGVuZ3RoIC0gMSkge1xuICAgICAgdGFyZ2V0LmJsdXIoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmlucHV0c1tuZXh0XS5mb2N1cygpO1xuICB9XG5cbiAgb25QYXN0ZShlOiBDbGlwYm9hcmRFdmVudCwgaTogbnVtYmVyKTogdm9pZCB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICBjb25zdCBkYXRhID0gZS5jbGlwYm9hcmREYXRhID8gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKS50cmltKCkgOiB1bmRlZmluZWQ7XG5cbiAgICBpZiAodGhpcy5pc0VtcHR5KGRhdGEpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCBwYXN0ZSB0ZXh0IGludG8gaXRlcmFibGVcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgY29uc3QgdmFsdWVzID0gZGF0YSEuc3BsaXQoJycpO1xuICAgIGxldCB2YWxJbmRleCA9IDA7XG5cbiAgICBmb3IgKGxldCBqID0gaTsgaiA8IHRoaXMuaW5wdXRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAvLyBUaGUgdmFsdWVzIGVuZCBpcyByZWFjaGVkLiBMb29wIGV4aXRcbiAgICAgIGlmICh2YWxJbmRleCA9PT0gdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5wdXQgPSB0aGlzLmlucHV0c1tqXTtcbiAgICAgIGNvbnN0IHZhbCA9IHZhbHVlc1t2YWxJbmRleF07XG5cbiAgICAgIC8vIENhbmNlbCB0aGUgbG9vcCB3aGVuIGEgdmFsdWUgY2Fubm90IGJlIHVzZWRcbiAgICAgIGlmICghdGhpcy5jYW5JbnB1dFZhbHVlKHZhbCkpIHtcbiAgICAgICAgdGhpcy5zZXRJbnB1dFZhbHVlKGlucHV0LCBudWxsKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZUZvcklucHV0KGlucHV0LCBJbnB1dFN0YXRlLnJlc2V0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNldElucHV0VmFsdWUoaW5wdXQsIHZhbC50b1N0cmluZygpKTtcbiAgICAgIHZhbEluZGV4Kys7XG4gICAgfVxuXG4gICAgdGhpcy5pbnB1dHNbaV0uYmx1cigpO1xuICAgIHRoaXMuZW1pdENoYW5nZXMoKTtcbiAgfVxuXG4gIGFzeW5jIG9uS2V5ZG93bihlOiBhbnksIGk6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgIGNvbnN0IGlzVGFyZ2V0RW1wdHkgPSB0aGlzLmlzRW1wdHkodGFyZ2V0LnZhbHVlKTtcbiAgICBjb25zdCBwcmV2ID0gaSAtIDE7XG5cbiAgICAvLyBwcm9jZXNzaW5nIG9ubHkgdGhlIGJhY2tzcGFjZSBhbmQgZGVsZXRlIGtleSBldmVudHNcbiAgICBjb25zdCBpc0JhY2tzcGFjZUtleSA9IGF3YWl0IHRoaXMuaXNCYWNrc3BhY2VLZXkoZSk7XG4gICAgY29uc3QgaXNEZWxldGVLZXkgPSB0aGlzLmlzRGVsZXRlS2V5KGUpO1xuICAgIGlmICghaXNCYWNrc3BhY2VLZXkgJiYgIWlzRGVsZXRlS2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdGhpcy5zZXRJbnB1dFZhbHVlKHRhcmdldCwgbnVsbCk7XG4gICAgaWYgKCFpc1RhcmdldEVtcHR5KSB7XG4gICAgICB0aGlzLmVtaXRDaGFuZ2VzKCk7XG4gICAgfVxuXG4gICAgLy8gcHJldmVudGluZyB0byBmb2N1c2luZyBvbiB0aGUgcHJldmlvdXMgZmllbGQgaWYgaXQgZG9lcyBub3QgZXhpc3Qgb3IgdGhlIGRlbGV0ZSBrZXkgaGFzIGJlZW4gcHJlc3NlZFxuICAgIGlmIChwcmV2IDwgMCB8fCBpc0RlbGV0ZUtleSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChpc1RhcmdldEVtcHR5IHx8IHRoaXMuaXNQcmV2Rm9jdXNhYmxlQWZ0ZXJDbGVhcmluZykge1xuICAgICAgdGhpcy5pbnB1dHNbcHJldl0uZm9jdXMoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG9uSW5wdXRDb2RlQ2hhbmdlcygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzRW1wdHkodGhpcy5jb2RlKSkge1xuICAgICAgdGhpcy5pbnB1dHMuZm9yRWFjaCgoaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQpID0+IHtcbiAgICAgICAgdGhpcy5zZXRJbnB1dFZhbHVlKGlucHV0LCBudWxsKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICBjb25zdCBjaGFycyA9IHRoaXMuY29kZSEudG9TdHJpbmcoKS50cmltKCkuc3BsaXQoJycpO1xuICAgIC8vIGNoZWNraW5nIGlmIGFsbCB0aGUgdmFsdWVzIGFyZSBjb3JyZWN0XG4gICAgbGV0IGlzQWxsQ2hhcnNBcmVBbGxvd2VkID0gdHJ1ZTtcbiAgICBmb3IgKGNvbnN0IGNoYXIgb2YgY2hhcnMpIHtcbiAgICAgIGlmICghdGhpcy5jYW5JbnB1dFZhbHVlKGNoYXIpKSB7XG4gICAgICAgIGlzQWxsQ2hhcnNBcmVBbGxvd2VkID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaW5wdXRzLmZvckVhY2goKGlucHV0OiBIVE1MSW5wdXRFbGVtZW50LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGlzQWxsQ2hhcnNBcmVBbGxvd2VkID8gY2hhcnNbaW5kZXhdIDogbnVsbDtcbiAgICAgIHRoaXMuc2V0SW5wdXRWYWx1ZShpbnB1dCwgdmFsdWUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBvbkNvZGVMZW5ndGhDaGFuZ2VzKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb2RlTGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fY29kZUxlbmd0aCA9IHRoaXMuY29kZUxlbmd0aDtcbiAgICBpZiAodGhpcy5fY29kZUxlbmd0aCA+IHRoaXMucGxhY2Vob2xkZXJzLmxlbmd0aCkge1xuICAgICAgY29uc3QgbnVtYmVycyA9IEFycmF5KHRoaXMuX2NvZGVMZW5ndGggLSB0aGlzLnBsYWNlaG9sZGVycy5sZW5ndGgpLmZpbGwoMSk7XG4gICAgICB0aGlzLnBsYWNlaG9sZGVycy5zcGxpY2UodGhpcy5wbGFjZWhvbGRlcnMubGVuZ3RoIC0gMSwgMCwgLi4ubnVtYmVycyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuX2NvZGVMZW5ndGggPCB0aGlzLnBsYWNlaG9sZGVycy5sZW5ndGgpIHtcbiAgICAgIHRoaXMucGxhY2Vob2xkZXJzLnNwbGljZSh0aGlzLl9jb2RlTGVuZ3RoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG9uSW5wdXRzTGlzdENoYW5nZXMobGlzdDogUXVlcnlMaXN0PEVsZW1lbnRSZWY+KTogdm9pZCB7XG4gICAgaWYgKGxpc3QubGVuZ3RoID4gdGhpcy5pbnB1dHMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBpbnB1dHNUb0FkZCA9IGxpc3QuZmlsdGVyKChpdGVtLCBpbmRleCkgPT4gaW5kZXggPiB0aGlzLmlucHV0cy5sZW5ndGggLSAxKTtcbiAgICAgIHRoaXMuaW5wdXRzLnNwbGljZSh0aGlzLmlucHV0cy5sZW5ndGgsIDAsIC4uLmlucHV0c1RvQWRkLm1hcChpdGVtID0+IGl0ZW0ubmF0aXZlRWxlbWVudCkpO1xuICAgICAgY29uc3Qgc3RhdGVzID0gQXJyYXkoaW5wdXRzVG9BZGQubGVuZ3RoKS5maWxsKElucHV0U3RhdGUucmVhZHkpO1xuICAgICAgdGhpcy5pbnB1dHNTdGF0ZXMuc3BsaWNlKHRoaXMuaW5wdXRzU3RhdGVzLmxlbmd0aCwgMCwgLi4uc3RhdGVzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAobGlzdC5sZW5ndGggPCB0aGlzLmlucHV0cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuaW5wdXRzLnNwbGljZShsaXN0Lmxlbmd0aCk7XG4gICAgICB0aGlzLmlucHV0c1N0YXRlcy5zcGxpY2UobGlzdC5sZW5ndGgpO1xuICAgIH1cblxuICAgIC8vIGZpbGxpbmcgdGhlIGlucHV0cyBhZnRlciBjaGFuZ2luZyBvZiB0aGVpciBjb3VudFxuICAgIHRoaXMub25JbnB1dENvZGVDaGFuZ2VzKCk7XG4gIH1cblxuICBwcml2YXRlIGZvY3VzT25JbnB1dEFmdGVyQXBwZWFyaW5nKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zdGF0ZS5pc0luaXRpYWxGb2N1c0ZpZWxkRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN0YXRlLmlzRm9jdXNpbmdBZnRlckFwcGVhcmluZ0NvbXBsZXRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICB0aGlzLmZvY3VzT25GaWVsZCh0aGlzLmluaXRpYWxGb2N1c0ZpZWxkISk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgIHRoaXMuc3RhdGUuaXNGb2N1c2luZ0FmdGVyQXBwZWFyaW5nQ29tcGxldGVkID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhpcy5pbnB1dHNbdGhpcy5pbml0aWFsRm9jdXNGaWVsZCFdO1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0Q2hhbmdlcygpOiB2b2lkIHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZW1pdENvZGUoKSwgNTApO1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0Q29kZSgpOiB2b2lkIHtcbiAgICBjb25zdCBjb2RlID0gdGhpcy5nZXRDdXJyZW50RmlsbGVkQ29kZSgpO1xuXG4gICAgdGhpcy5jb2RlQ2hhbmdlZC5lbWl0KGNvZGUpO1xuXG4gICAgaWYgKGNvZGUubGVuZ3RoID49IHRoaXMuX2NvZGVMZW5ndGgpIHtcbiAgICAgIHRoaXMuY29kZUNvbXBsZXRlZC5lbWl0KGNvZGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q3VycmVudEZpbGxlZENvZGUoKTogc3RyaW5nIHtcbiAgICBsZXQgY29kZSA9ICcnO1xuXG4gICAgZm9yIChjb25zdCBpbnB1dCBvZiB0aGlzLmlucHV0cykge1xuICAgICAgaWYgKCF0aGlzLmlzRW1wdHkoaW5wdXQudmFsdWUpKSB7XG4gICAgICAgIGNvZGUgKz0gaW5wdXQudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICBwcml2YXRlIGlzQmFja3NwYWNlS2V5KGU6IGFueSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGlzQmFja3NwYWNlID0gKGUua2V5ICYmIGUua2V5LnRvTG93ZXJDYXNlKCkgPT09ICdiYWNrc3BhY2UnKSB8fCAoZS5rZXlDb2RlICYmIGUua2V5Q29kZSA9PT0gOCk7XG4gICAgaWYgKGlzQmFja3NwYWNlKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3Mgb25seSBrZXkgd2l0aCBwbGFjZWhvbGRlciBrZXljb2RlIG9uIGFuZHJvaWQgZGV2aWNlc1xuICAgIGlmICghZS5rZXlDb2RlIHx8IGUua2V5Q29kZSAhPT0gMjI5KSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IGUudGFyZ2V0O1xuICAgICAgICBjb25zdCBpc1Jlc2V0ID0gdGhpcy5nZXRTdGF0ZUZvcklucHV0KGlucHV0KSA9PT0gSW5wdXRTdGF0ZS5yZXNldDtcbiAgICAgICAgaWYgKGlzUmVzZXQpIHtcbiAgICAgICAgICB0aGlzLnNldFN0YXRlRm9ySW5wdXQoaW5wdXQsIElucHV0U3RhdGUucmVhZHkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIGJhY2tzcGFjZSBrZXkgcHJlc3NlZCB0aGUgY2FyZXQgd2lsbCBoYXZlIHBvc2l0aW9uIDAgKGZvciBzaW5nbGUgdmFsdWUgZmllbGQpXG4gICAgICAgIHJlc29sdmUoaW5wdXQuc2VsZWN0aW9uU3RhcnQgPT09IDAgJiYgIWlzUmVzZXQpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGlzRGVsZXRlS2V5KGU6IGFueSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoZS5rZXkgJiYgZS5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2RlbGV0ZScpIHx8IChlLmtleUNvZGUgJiYgZS5rZXlDb2RlID09PSA0Nik7XG4gIH1cblxuICBwcml2YXRlIHNldElucHV0VmFsdWUoaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQsIHZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICBjb25zdCBpc0VtcHR5ID0gdGhpcy5pc0VtcHR5KHZhbHVlKTtcbiAgICBjb25zdCB2YWx1ZUNsYXNzQ1NTID0gJ2hhcy12YWx1ZSc7XG4gICAgY29uc3QgZW1wdHlDbGFzc0NTUyA9ICdlbXB0eSc7XG4gICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgIGlucHV0LnZhbHVlID0gJyc7XG4gICAgICBpbnB1dC5jbGFzc0xpc3QucmVtb3ZlKHZhbHVlQ2xhc3NDU1MpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgaW5wdXQucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LmFkZChlbXB0eUNsYXNzQ1NTKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpbnB1dC52YWx1ZSA9IHZhbHVlO1xuICAgICAgaW5wdXQuY2xhc3NMaXN0LmFkZCh2YWx1ZUNsYXNzQ1NTKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgIGlucHV0LnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5yZW1vdmUoZW1wdHlDbGFzc0NTUyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjYW5JbnB1dFZhbHVlKHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5pc0VtcHR5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGlzRGlnaXRzVmFsdWUgPSAvXlswLTldKyQvLnRlc3QodmFsdWUudG9TdHJpbmcoKSk7XG4gICAgcmV0dXJuIGlzRGlnaXRzVmFsdWUgfHwgKHRoaXMuaXNDaGFyc0NvZGUgfHwgdGhpcy5pc05vbkRpZ2l0c0NvZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRTdGF0ZUZvcklucHV0KGlucHV0OiBIVE1MSW5wdXRFbGVtZW50LCBzdGF0ZTogSW5wdXRTdGF0ZSk6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pbnB1dHMuaW5kZXhPZihpbnB1dCk7XG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuaW5wdXRzU3RhdGVzW2luZGV4XSA9IHN0YXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTdGF0ZUZvcklucHV0KGlucHV0OiBIVE1MSW5wdXRFbGVtZW50KTogSW5wdXRTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLmlucHV0cy5pbmRleE9mKGlucHV0KTtcbiAgICByZXR1cm4gdGhpcy5pbnB1dHNTdGF0ZXNbaW5kZXhdO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0VtcHR5KHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgfHwgIXZhbHVlLnRvU3RyaW5nKCkubGVuZ3RoO1xuICB9XG59XG4iLCI8c3BhbiAqbmdGb3I9XCJsZXQgaG9sZGVyIG9mIHBsYWNlaG9sZGVyczsgaW5kZXggYXMgaVwiXG4gICAgICBbY2xhc3MuY29kZS1oaWRkZW5dPVwiaXNDb2RlSGlkZGVuXCI+XG4gIDxpbnB1dCAjaW5wdXRcbiAgICAgICAgIChjbGljayk9XCJvbkNsaWNrKCRldmVudClcIlxuICAgICAgICAgKHBhc3RlKT1cIm9uUGFzdGUoJGV2ZW50LCBpKVwiXG4gICAgICAgICAoaW5wdXQpPVwib25JbnB1dCgkZXZlbnQsIGkpXCJcbiAgICAgICAgIChrZXlkb3duKT1cIm9uS2V5ZG93bigkZXZlbnQsIGkpXCJcbiAgICAgICAgIFt0eXBlXT1cImlucHV0VHlwZVwiXG4gICAgICAgICBbZGlzYWJsZWRdPVwiZGlzYWJsZWRcIlxuICAgICAgICAgW2F0dHIuaW5wdXRtb2RlXT1cImlucHV0TW9kZVwiXG4gICAgICAgICBbYXR0ci5hdXRvY2FwaXRhbGl6ZV09XCJhdXRvY2FwaXRhbGl6ZVwiXG4gICAgICAgICBhdXRvY29tcGxldGU9XCJvbmUtdGltZS1jb2RlXCIvPlxuPC9zcGFuPlxuIl19