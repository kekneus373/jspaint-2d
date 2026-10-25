// @ts-check
import { undo } from "./functions.js";
import { $G } from "./helpers.js";

let $floating_buttons = null;
let clean_up_floating_buttons = null;
async function update_floating_buttons() {
	await new Promise((resolve) => $(resolve));

	clean_up_floating_buttons?.();

	if (!$("body").hasClass("easy-undo-mode")) {
		return;
	}

	$floating_buttons = $("<div class='floating-buttons'/>").appendTo("body");
	$("<button title='Undo' class='floating-undo-button'/>")
		.on("click", undo)
		.appendTo($floating_buttons)
		.append($("<div class='button-icon'>"));

	const update_width = () => {
		$("body").css("--floating-buttons-width", $floating_buttons[0].getBoundingClientRect().width + "px");
	};
	update_width();
	$G.on("theme-load", update_width);

	clean_up_floating_buttons = () => {
		$("body").css("--floating-buttons-width", "0px");
		$G.off("theme-load", update_width);
		$floating_buttons.remove();
		$floating_buttons = null;
		clean_up_floating_buttons = null;
	};
}

$G.on("easy-undo-mode-toggled", update_floating_buttons);
// Enlarge UI mode: menu scaling
// other scaling code is in specific files like $Component.js and $ToolWindow.js
// but MenuBar isn't owned by this repo
// TODO: separate file too?

const apply_scale = (menu_popup) => {
	const enabled = $("body").hasClass("enlarge-ui");

	const $menu_popup = $(menu_popup);
	const is_submenu = $menu_popup.is("[data-semantic-parent^='menu-popup']");

	const reset_scale_css = () => {
		$menu_popup.css({
			transform: "",
			transformOrigin: "",
			marginLeft: "",
			marginTop: "",
		});
	};

	if (!enabled) {
		menu_popup.getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
		reset_scale_css();
		return;
	}

	let own_call = true;
	// Override getBoundingClientRect to ignore the transform,
	// and potentially schedule updating the scale, for a resize event.
	// It's used in here but also in MenuBar.js for positioning (see update_position_from_containing_bounds)
	menu_popup.getBoundingClientRect = () => {
		reset_scale_css();
		const bounds = HTMLElement.prototype.getBoundingClientRect.call(menu_popup);
		// For our own call of getBoundingClientRect, we don't want to recurse,
		// and we don't need to restore the CSS either since we'll be setting it again.
		if (!own_call) {
			requestAnimationFrame(() => {
				apply_scale(menu_popup);
			});
		}
		return bounds;
	};

	// Measure the untransformed size
	const base_bounds = menu_popup.getBoundingClientRect();
	own_call = false;

	// Define CSS properties for scaling
	const scale = Math.min(1,
		Math.min(
			innerWidth / base_bounds.width,
			(is_submenu ? innerHeight : innerHeight - base_bounds.top) / base_bounds.height,
		)
	);
	const scaled_width = base_bounds.width * scale;
	const scaled_height = base_bounds.height * scale;
	let new_left = Math.max(Math.min(base_bounds.left, window.innerWidth - scaled_width), 0);
	// Move submenus to the right edge of the screen if there's not enough room
	// I don't know what Windows 98 does, but this feels better, although the left border is hard to see...
	// Also, not really taking into account RTL languages here.
	// Hm, also, this makes it inconsistent with the non-Enlarge UI mode behavior....
	if (base_bounds.left === 0 && is_submenu) {
		new_left = window.innerWidth - scaled_width;
	}
	const new_top = is_submenu ? Math.min(base_bounds.top, window.innerHeight - scaled_height) : base_bounds.top;

	$menu_popup.css({
		transform: `scale(${scale})`,
		transformOrigin: "0% 0%",

		// Don't need to reserve space for other elements since menu popups are floating
		// marginRight: base_bounds.width * (scale - 1),
		// marginBottom: base_bounds.height * (scale - 1),

		// Move the menu up/left to fit all on the screen
		// Not using left/top so that the effect can be reset; they're already used for positioning.
		// That may not be an important concern considering the menus would need repositioning when toggling the setting, and should really be closed when toggling the setting.
		marginLeft: new_left - base_bounds.left,
		marginTop: new_top - base_bounds.top,
	});
};

let observer;
const update_auto_scaling = () => {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
	if ($("body").hasClass("enlarge-ui")) {
		// - `.menu-popup` elements can exist in the DOM before the menu is opened, hidden with `style.display = "none";`
		// - `.menu-popup` elements may not exist yet when this code runs
		// - We want to avoid running the scaling code any time other than a menu being opened
		//   - It MUST not cause recursion when modifying the styles for scaling in the `MutationObserver` callback
		// - This code should work regardless of whether `.menu-popup` elements are be shown with `style.display = "block";` or `style.display = "";`
		observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (!(mutation.target instanceof HTMLElement)) {
					continue; // type narrowing, to avoid type checker errors
				}
				if (
					mutation.attributeName === "style" &&
					mutation.target.style.display !== "none" &&
					mutation.oldValue?.includes("display: none") &&
					mutation.target.matches(".menu-popup")
				) {
					// setTimeout(() => {
					apply_scale(mutation.target);
					// }, 1000);
				}
			}
		});
		observer.observe(document.body, {
			attributes: true,
			attributeOldValue: true,
			attributeFilter: ["style"],
			subtree: true,
		});
	}
	// Apply scaling to existing menus
	setTimeout(() => {
		// Trigger update_position_from_containing_bounds in MenuBar.js, which uses getBoundingClientRect overridden above
		if (!$("body").hasClass("enlarge-ui")) {
			for (const el of $(".menu-popup")) {
				el.dispatchEvent(new CustomEvent("update", {}));
			}
		}
		for (const el of $(".menu-popup")) {
			apply_scale(el);
		}
	}, 0);
};
$G.on("enlarge-ui-toggled", update_auto_scaling);
update_auto_scaling();
