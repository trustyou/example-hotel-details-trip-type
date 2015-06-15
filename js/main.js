(function($, Mustache) {
	"use strict";

	var hotelData = {
		name: "Bellagio Las Vegas",
		address: "South Las Vegas Boulevard 3600, NV 89109, Las Vegas, USA",
		tyId: "674fa44c-1fbd-4275-aa72-a20f262372cd",
		imgUrl: "img/674fa44c-1fbd-4275-aa72-a20f262372cd.jpg"
	};

	/*
	When querying a JSON widget, always ask for the specific version you
	developed against. This guarantees that no schema-breaking changes will
	affect your code.
	*/
	var url = "http://api.trustyou.com/hotels/" + hotelData.tyId + "/meta_review.json?" + $.param({
		lang: "en",
		/*
		This is a demo API key, do not reuse it! Contact TrustYou to
		receive your own.
		*/
		key: "a06294d3-4d58-45c8-97a1-5c905922e03a",
		v: "5.25"
	});
	var reviewSummaryRequest = $.ajax({
		url: url,
		// Usage of JSONP is not required for server-side calls
		dataType: "jsonp"
	}).fail(function() {
		throw "API request failed!";
	});

	/**
	* Render the basic hotel info.
	*/
	function renderHotelInfo(hotelData, reviewSummary) {
		var hotelInfoTemplate = $("#tmpl-hotel-info").html();
		var templateData = {
			name: hotelData.name,
			address: hotelData.address,
			imgUrl: hotelData.imgUrl,
			reviewsCount: reviewSummary["reviews_count"],
			trustScore: reviewSummary["summary"].score,
			popularity: reviewSummary["summary"].popularity,
			summary: reviewSummary["summary"].text
		};

		// transform hotel types to the format expected by the template
		templateData.hotelTypes = reviewSummary["hotel_type_list"].map(function(hotelType) {
			return {
				categoryId: hotelType["category_id"],
				/*
				Texts in the "text" property contain markers
				in the form of <pos>..</pos>, <neg>..</neg> and
				<neu>..</neu>, which enclose passages in the
				text that contain sentiment. Either remove
				these before displaying the text, or replace
				them with meaningful markup, as is done here.
				*/
				text: hotelType["text"].replace("<pos>", "<strong>").replace("</pos>", "</strong>")
			};
		});

		var hotelInfoRendered = Mustache.render(hotelInfoTemplate, templateData);
		$("#hotel-info").append(hotelInfoRendered);
	}

	/**
	* Render filtered review summaries.
	*
	* The markup is structured like this: Sections to render hotel_type_list, category_list and good_to_know_list are put in separate templates. They are rendered once for the overall review summary, and then repeatedly for each filtered review summary, i.e. for business travelers, families etc. The UI is then made interactive to let the user switch between them.
	*/
	function renderReviewSummaries(reviewSummary) {

		// display names for all filter types
		var filterNames = {
			business: "Business travelers",
			couple: "Couples",
			family: "Families",
			solo: "Solo travelers"
		};

		/**
		* Transform a category object into the format expected by the
		* template. Since category objects look the same in category_list,
		* good_to_know_list and hotel_type_list, this function can be
		* applied to all these properties.
		*/
		function transformCategory (category) {
			/*
			Show up to three returned highlights. If no highlights
			are present, the "short_text" is shown instead.
			*/
			var highlights = category["highlight_list"];
			if (category["short_text"]) {
				highlights = highlights.concat({text: category["short_text"]});
			}
			highlights = highlights.slice(0, 3);
			return {
				categoryId: category["category_id"],
				categoryName: category["category_name"],
				score: category["score"],
				sentiment: category["sentiment"],
				/*
				Remove the markers in the form of <pos>..</pos>,
				<neg>..</neg> and <neu>..</neu> with a regular
				expression.
				*/
				text: (category["text"] || "").replace(/<\/?(?:pos|neu|neg|strong)>/g, ''),
				highlights: highlights,
				summarySentences: (category["summary_sentence_list"] || []).map(function(summarySentence) {
					return {
						sentiment: (summarySentence["sentiment"] == "neg" ? "remove" : "ok"),
						text: summarySentence["text"]
					};
				})
			};
		}

		var filtersData = {
			/*
			Transform each of the returned filtered summaries (solo,
			business, families etc.) into the format expected by the
			template. Here, we will keep all category lists in the
			order in which they were returned from the API. This
			way, our visualization should look like the official
			TrustYou HTML visualization.
			*/
			filters: reviewSummary["trip_type_meta_review_list"].map(function(filteredReviewSummary) {
				var filterId = filteredReviewSummary["filter"]["trip_type"];
				return {
					filterId: filterId,
					filterName: filterNames[filterId],
					reviewsPercent: filteredReviewSummary["reviews_percent"],
					categories: filteredReviewSummary["category_list"].map(transformCategory),
					goodToKnow: filteredReviewSummary["good_to_know_list"].map(transformCategory)
				};
			})
		};

		/*
		Render the filter bar. The "All" button is hardcoded in the
		template.
		*/
		var filterBarTemplate = $("#tmpl-filter-bar").html();
		var filterBarRendered = Mustache.render(filterBarTemplate, filtersData);
		$("#filter-bar").html(filterBarRendered);

		/*
		For the remaining elements, put the overall review summary in
		the mix. It has nearly the same format as the filtered summaries.
		*/
		filtersData.filters.push({
			filterId: "all",
			filterName: "All travelers",
			reviewsPercent: 100,
			hotelType: [],
			categories: reviewSummary["category_list"].map(transformCategory),
			goodToKnow: reviewSummary["good_to_know_list"].map(transformCategory)
		});

		/*
		Render the review summaries, i.e. bar charts of category scores
		and sub categories.
		*/
		var reviewSummariesTemplate = $("#tmpl-review-summaries").html();
		var reviewSummariesRendered = Mustache.render(reviewSummariesTemplate, filtersData);
		$("#review-summaries").html(reviewSummariesRendered);

		/*
		Render the "good to know" sections, which are also specific to
		the filtered summaries.
		*/
		var goodToKnowTemplate = $("#tmpl-good-to-know").html();
		var goodToKnowRendered = Mustache.render(goodToKnowTemplate, filtersData);
		$("#good-to-know").html(goodToKnowRendered);
	}

	/**
	Process a response from the TrustYou Review Summary API.
	*/
	function processReviewSummaryResponse(data) {
		// check whether the API request was successful
		if (data.meta.code !== 200) {
			throw "API request failed!";
		}
		var reviewSummary = data.response;
		renderHotelInfo(hotelData, reviewSummary);
		renderReviewSummaries(reviewSummary);
		addHandlers();
	}

	// when the DOM is ready for rendering, process the API response
	$(function() {
		reviewSummaryRequest.done(processReviewSummaryResponse);
	});

}($, Mustache));

/**
* After all HTML elements were rendered, this function is called to make the UI
* interactive. I.e. to allow the user to switch between different filters, and
* toggle the level of detail.
*/
function addHandlers() {

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
	}});
	
	$('a[href=all]').click();
}
