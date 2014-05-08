$(document).ready(function(){

	// check to see if text has been truncated by CSS code

	function isTrunkated($jQueryObject) {
		return ($jQueryObject.outerWidth() < $jQueryObject[0].scrollWidth);
	}

	// detect IE version... because normal browsers are too mainstream

	function isIE () {
		var myNav = navigator.userAgent.toLowerCase();
		return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
	}

	/* fallback for browsers which don't support the [calc] definition from CSS3 */

	function oveflowTextContent(container) {

		// set body as the default container
		container = typeof container !== 'undefined' ? container : 'body';
		var textWidth = 0;

		$(container + ' .category-results').each(function(){
			textWidth = $(this).parent().width() - $(this).siblings('.category-label').width();
			if(textWidth < 1)
				textWidth = $(this).parent().width();
			$(this).width(textWidth);
		});

		$(container + ' .result-description').each(function(){
			textWidth = $(this).parent().width() - $(this).siblings('.result-chart').outerWidth(true);
			if(textWidth < 1)
				textWidth = $(this).parent().width();
			$(this).width(textWidth);
		});

		// add the [+] button for truncated texts (read more trigger)

		$(container + ' .category-results p').each(function(){
			if (isTrunkated($(this))){
				$(this).parent('.result-description').addClass('text-truncate-on');
			}
			else if(isIE() > 9 || !isIE()) {
				$(this).siblings('.toggle-content').html('<i class="ty-icon ty-icon-plus"></i>');
				$(this).parent('.result-description').removeClass('text-truncate-on text-truncate-off');
			}
		});

	}

	window.onresize = function() {
		oveflowTextContent();
	};

	window.onload = function() {
		oveflowTextContent();
	};

	// handle the showing/hiding of details: extra snippets & subcategories

	$('[id*="toggle-details"]').on('click', function(){

		$toggleBtn = $(this);
		$toggleBtn.toggleClass('show');

		// only show a single snippet

		$(this).parents('.summary-section').find('.category-snippets p:last-child:not(:only-child)').fadeToggle();

		// show subcategories by sliding and fading the same time

		$(this).parents('.summary-section').find(".category-subcategory").each(function(index) {
			$(this).delay(20*index).animate({
				height: "toggle",
				opacity: "toggle"
			}, 100);
		});

		// once animation is complete, update text for the toggle button

		if($toggleBtn.hasClass('show'))
			$toggleBtn.html('<i class="ty-icon ty-icon-preview"></i> ' + $toggleBtn.attr('data-label-show'));
		else
			$toggleBtn.html('<i class="ty-icon ty-icon-preview-off"></i> ' + $toggleBtn.attr('data-label-hide'));

	});		

	// handle toggling of truncated texts

	$('.result-description').each(function(){

		$(this).on('click', function(){

			var toggleContent = $(this).find('.toggle-content');

			if($(this).hasClass('text-truncate-on') || $(this).hasClass('text-truncate-off')){

				$(this).toggleClass('text-truncate-on text-truncate-off');

				if($(this).hasClass('text-truncate-on')) {
					toggleContent.html('<i class="ty-icon ty-icon-plus"></i>');
				}
				else {
					toggleContent.html('<i class="ty-icon ty-icon-minus"></i>');
				}
			}

		});
	});

	// show tops & flops without flickering of height
	//
	// adjusting text overflows for tops & flops causes it's parent container's height to flicker
	// as it's initial height is first larger due to line breaking
	//
	// Solution:
	//
	// 1. Position absolute
	// 2. Set opacity to 0
	// 3. Display it as a block (so it's above everything and transparent, but still has actual width+height)
	// 4. Adjust text overflows (which in turn affects the height)
	// 5. Position relative (which automatically makes it's parent container scale to fit)
	// 6. Set opacity to 1 (making it visible to the user)

	function toggleTopsFlops (id, parent){

		// set body as the default container
		id = typeof id !== 'undefined' ? id : 'body';

		// current tops & flops section
		var topsFlops = $(id);

		// make the current tops & flops absolute and transparent
		topsFlops.hide().addClass('absolute').show();

		// adjust text overflows for current tops & flops
		oveflowTextContent(id);

		// position current tops & flops relative and display it
		topsFlops.removeClass('absolute').animate({
			opacity: 1
		}, 200);
	}

	// switch content for tops & flops, good to know, type of hotel to match traveler type

	function switchContent (selector, exception, duration, callback){

		// fade out all other similar content

		$(selector).not($(exception)).each(function(){
			if ($(this).is(':visible'))
				$(this).animate(
					{ opacity: 0 }, 
					duration, 
					function(){
						$(this).hide();
					});
		});

		// wait for similar content to fade out and display the selected one
		setTimeout(function() {
			callback();
		}, duration);

	}

	$('.tile > a').on('click', function(event){

		event.preventDefault();

		// select curret clicked item
		if(!$(this).parent().hasClass('selected')){
			$('.tile').removeClass('selected');
			$(this).parent().addClass('selected');

		// save data in variables

		var travelerType = $(this).attr('href');
		var thisHighlights = $('#highlights-' + travelerType);
		var thisTopsFlops = $('#tops-flops-' + travelerType);
		var thisGoodToKnow = $('#good-to-know-' + travelerType);

		switchContent ('.traveler-type-highlights .tops-flops', '#highlights-' + travelerType, 150, function(){
			// if no filter is used
			if(travelerType == 'all'){
				$('.summary-filters').removeClass('filters-on');
				$('.traveler-type-highlights').hide();
			}
			// if content is filtered
			else{
				$('.summary-filters').addClass('filters-on');
				$('.traveler-type-highlights').show();
			}
			toggleTopsFlops('#highlights-' + travelerType);
		});

		switchContent ('.summary-section.tops-flops', '#tops-flops-' + travelerType, 150, function(){
			toggleTopsFlops('#tops-flops-' + travelerType);
		});

		switchContent ('.good-to-know', '#good-to-know-' + travelerType, 150, function(){
			thisGoodToKnow.css('opacity', 1).fadeIn(150);
		});
	}
	
});

});