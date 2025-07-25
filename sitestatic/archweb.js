/*'use strict';*/
/* tablesorter custom parsers for various pages:
 * devel/index.html, mirrors/status.html, todolists/view.html */
if (typeof $ !== 'undefined' && typeof $.tablesorter !== 'undefined') {
    $.tablesorter.addParser({
        id: 'pkgcount',
        is: function(s) { return false; },
        format: function(s) {
            var m = s.match(/\d+/);
            return m ? parseInt(m[0], 10) : 0;
        },
        type: 'numeric'
    });

    $.tablesorter.addParser({
        id: 'todostatus',
        is: function(s) { return false; },
        format: function(s) {
            if (s.match(/incomplete/i)) {
                return 1;
            } else if (s.match(/in-progress/i)) {
                return 0.5;
            }
            return 0;
        },
        type: 'numeric'
    });

    $.tablesorter.addParser({
        /* sorts numeric, but put '', 'unknown', and '∞' last. */
        id: 'mostlydigit',
        special: ['', 'unknown', '∞'],
        is: function(s, table) {
            var c = table.config;
            return ($.inArray(s, this.special) > -1) || $.tablesorter.isDigit(s, c);
        },
        format: function(s, t) {
            if ($.inArray(s, this.special) > -1) {
                return Number.MAX_VALUE;
            }
            return $.tablesorter.formatFloat(s, t);
        },
        type: 'numeric'
    });

    $.tablesorter.addParser({
        /* sorts duration; put '', 'unknown', and '∞' last. */
        id: 'duration',
        re: /^([0-9]+):([0-5][0-9])$/,
        special: ['', 'unknown', '∞'],
        is: function(s) {
            return ($.inArray(s, this.special) > -1) || this.re.test(s);
        },
        format: function(s) {
            if ($.inArray(s, this.special) > -1) {
                return Number.MAX_VALUE;
            }
            var matches = this.re.exec(s);
            if (!matches) {
                return Number.MAX_VALUE;
            }
            return matches[1] * 60 + matches[2];
        },
        type: 'numeric'
    });
    $.tablesorter.addParser({
        id: 'epochdate',
        is: function(s) { return false; },
        format: function(s, t, c) {
            /* TODO: this assumes our magic class is the only one */
            var epoch = $(c).attr('class');
            if (epoch.indexOf('epoch-') !== 0) {
                return 0;
            }
            return epoch.slice(6);
        },
        type: 'numeric'
    });

    $.tablesorter.addParser({
        id: 'longDateTime',
        re: /^(\d{4})-(\d{2})-(\d{2}) ([012]\d):([0-5]\d)(:([0-5]\d))?( (\w+))?$/,
        is: function(s) {
            return this.re.test(s);
        },
        format: function(s, t) {
            var matches = this.re.exec(s);
            if (!matches) {
                return 0;
            }
            /* skip group 6, group 7 is optional seconds */
            if (matches[7] === undefined) {
                matches[7] = 0;
            }
            /* The awesomeness of the JS date constructor. Month needs to be
             * between 0-11, because things have to be difficult. */
            var date = new Date(matches[1], matches[2] - 1, matches[3],
                matches[4], matches[5], matches[7]);
            return $.tablesorter.formatFloat(date.getTime(), t);
        },
        type: 'numeric'
    });

    $.tablesorter.addParser({
        id: 'filesize',
        re: /^(\d+(?:\.\d+)?)[ \u00a0](bytes?|[KMGTPEZY]i?B)$/,
        is: function(s) {
            return this.re.test(s);
        },
        format: function(s) {
            var matches = this.re.exec(s);
            if (!matches) {
                return 0;
            }
            var size = parseFloat(matches[1]),
                suffix = matches[2];

            switch(suffix) {
                /* intentional fall-through at each level */
                case 'YB':
                case 'YiB':
                    size *= 1024;
                case 'ZB':
                case 'ZiB':
                    size *= 1024;
                case 'EB':
                case 'EiB':
                    size *= 1024;
                case 'PB':
                case 'PiB':
                    size *= 1024;
                case 'TB':
                case 'TiB':
                    size *= 1024;
                case 'GB':
                case 'GiB':
                    size *= 1024;
                case 'MB':
                case 'MiB':
                    size *= 1024;
                case 'KB':
                case 'KiB':
                    size *= 1024;
            }
            return size;
        },
        type: 'numeric'
    });

    $.tablesorter.removeParser = function(id) {
        $.tablesorter.parsers = $.grep($.tablesorter.parsers,
                function(ele, i) {
                    return ele.id !== id;
                });
    };

    // We don't use currency, and the parser is over-zealous at deciding it
    // matches. Kill it from the parser selection.
    $.tablesorter.removeParser('currency');
}

(function($) {
  $.fn.enableCheckboxRangeSelection = function() {
    var lastCheckbox = null,
        spec = this;

    spec.unbind("click.checkboxrange");
    spec.bind("click.checkboxrange", function(e) {
      if (lastCheckbox !== null && e.shiftKey) {
        spec.slice(
          Math.min(spec.index(lastCheckbox), spec.index(e.target)),
          Math.max(spec.index(lastCheckbox), spec.index(e.target)) + 1
        ).attr({checked: e.target.checked ? "checked" : ""});
      }
      lastCheckbox = e.target;
    });

  };
})(jQuery);

/* todolists/view.html */
function todolist_flag() {
    // TODO: fix usage of this
    var link = this;
    $.getJSON(link.href, function(data) {
        $(link).text(data.status).removeClass(
            'complete inprogress incomplete').addClass(
            data.css_class.toLowerCase());
        /* let tablesorter know the cell value has changed */
        $('.results').trigger('updateCell', [$(link).closest('td')[0], false, null]);
    });
    return false;
}

function filter_pkgs_list(filter_ele, tbody_ele) {
    /* start with all rows, and then remove ones we shouldn't show */
    var rows = $(tbody_ele).children(),
        all_rows = rows;
    /* apply the filters, cheaper ones first */
    if ($('#id_mine_only').is(':checked')) {
        rows = rows.filter('.mine');
    }
    /* apply arch and repo filters */
    $(filter_ele + ' .arch_filter').add(
            filter_ele + ' .repo_filter').each(function() {
        if (!$(this).is(':checked')) {
            rows = rows.not('.' + $(this).val());
        }
    });
    /* more expensive filter because of 'has' call */
    if ($('#id_incomplete').is(':checked')) {
        rows = rows.has('.incomplete');
    }
    /* hide all rows, then show the set we care about */
    // note that we don't use .hide() from jQuery because it adds display:none
    // which is very expensive to query in CSS ([style*="display: none"])
    all_rows.each(function() {
        $(this).attr('hidden', true);
    });
    rows.each(function() {
        $(this).removeAttr('hidden');
    });
    $('#filter-count').text(rows.length);
    /* make sure we update the odd/even styling from sorting */
    $('.results').trigger('applyWidgets', [false]);
}
function filter_pkgs_reset(callback) {
    $('#id_incomplete').prop('checked', false);
    $('#id_mine_only').prop('checked', false);
    $('.arch_filter').prop('checked', true);
    $('.repo_filter').prop('checked', true);
    callback();
}

function filter_todolist_save(list_id) {
    var state = $('#todolist_filter').serializeArray();
    localStorage['filter_todolist_' + list_id] = JSON.stringify(state);
}
function filter_todolist_load(list_id) {
    var state = localStorage['filter_todolist_' + list_id];
    if (!state)
        return;
    state = JSON.parse(state);
    $('#todolist_filter input[type="checkbox"]').prop('checked', false);
    $.each(state, function (i, v) {
        // this assumes our only filters are checkboxes
        $('#todolist_filter input[name="' + v['name'] + '"]').prop('checked', true);
    });
}

function filter_report_save(report_id) {
    var state = $('#report_filter').serializeArray();
    localStorage['filter_report_' + report_id] = JSON.stringify(state);
}
function filter_report_load(report_id) {
    var state = localStorage['filter_report_' + report_id];
    if (!state)
        return;
    state = JSON.parse(state);
    $('#report_filter input[type="checkbox"]').prop('checked', false);
    $.each(state, function (i, v) {
        // this assumes our only filters are checkboxes
        $('#report_filter input[name="' + v['name'] + '"]').prop('checked', true);
    });
}

/* signoffs.html */
function signoff_package() {
    // TODO: fix usage of this
    var link = this;
    $.getJSON(link.href, function(data) {
        link = $(link);
        var signoff = null,
            cell = link.closest('td');
        if (data.created) {
            signoff = $('<li>').addClass('signed-username').text(data.user);
            var list = cell.children('ul.signoff-list');
            if (list.length === 0) {
                list = $('<ul class="signoff-list">').prependTo(cell);
            }
            list.append(signoff);
        } else if(data.user) {
            signoff = link.closest('td').find('li').filter(function(index) {
                return $(this).text() == data.user;
            });
        }
        if (signoff && data.revoked) {
            signoff.text(signoff.text() + ' (revoked)');
        }
        /* update the approved column to reflect reality */
        var approved = link.closest('tr').children('.approval');
        approved.attr('class', 'approval');
        if (data.known_bad) {
            approved.text('Bad').addClass('signoff-bad');
        } else if (!data.enabled) {
            approved.text('Disabled').addClass('signoff-disabled');
        } else if (data.approved) {
            approved.text('Yes').addClass('signoff-yes');
        } else {
            approved.text('No').addClass('signoff-no');
        }
        link.removeAttr('title');
        /* Form our new link. The current will be something like
         * '/packages/repo/arch/package/...' */
        var base_href = link.attr('href').split('/').slice(0, 5).join('/');
        if (data.revoked) {
            link.text('Signoff');
            link.attr('href', base_href + '/signoff/');
            /* should we be hiding the link? */
            if (data.known_bad || !data.enabled) {
                link.remove();
            }
        } else {
            link.text('Revoke Signoff');
            link.attr('href', base_href + '/signoff/revoke/');
        }
        /* let tablesorter know the cell value has changed */
        $('.results').trigger('updateCell', [approved[0], false, null]);
    });
    return false;
}

function filter_signoffs() {
    /* start with all rows, and then remove ones we shouldn't show */
    var rows = $('#tbody_signoffs').children(),
        all_rows = rows;
    /* apply the filters, cheaper ones first */
    if ($('#id_mine_only').is(':checked')) {
        rows = rows.filter('.mine');
    }
    /* apply arch and repo filters */
    $('#signoffs_filter .arch_filter').add(
            '#signoffs_filter .repo_filter').each(function() {
        if (!$(this).is(':checked')) {
            rows = rows.not('.' + $(this).val());
        }
    });
    /* and then the slightly more expensive pending check */
    if ($('#id_pending').is(':checked')) {
        rows = rows.has('td.signoff-no');
    }
    /* hide all rows, then show the set we care about */
    // note that we don't use .hide() from jQuery because it adds display:none
    // which is very expensive to query in CSS ([style*="display: none"])
    all_rows.each(function() {
        $(this).attr('hidden', true);
    });
    rows.each(function() {
        $(this).removeAttr('hidden');
    });
    $('#filter-count').text(rows.length);
    /* make sure we update the odd/even styling from sorting */
    $('.results').trigger('applyWidgets', [false]);
    filter_signoffs_save();
}
function filter_signoffs_reset() {
    $('#signoffs_filter .arch_filter').prop('checked', true);
    $('#signoffs_filter .repo_filter').prop('checked', true);
    $('#id_mine_only').prop('checked', false);
    $('#id_pending').prop('checked', false);
    filter_signoffs();
}
function filter_signoffs_save() {
    var state = $('#signoffs_filter').serializeArray();
    localStorage['filter_signoffs'] = JSON.stringify(state);
}
function filter_signoffs_load() {
    var state = localStorage['filter_signoffs'];
    if (!state)
        return;
    state = JSON.parse(state);
    $('#signoffs_filter input[type="checkbox"]').prop('checked', false);
    $.each(state, function (i, v) {
        // this assumes our only filters are checkboxes
        $('#signoffs_filter input[name="' + v['name'] + '"]').prop('checked', true);
    });
}

function collapseNotes(elements) {
    // Remove any trailing <br/> tags from the note contents
    $(elements).children('br').filter(':last-child').filter(function(i, e) { return !e.nextSibling; }).remove();

    var maxElements = 8;
    $(elements).each(function(idx, ele) {
        ele = $(ele);
        // Hide everything past a given limit. Don't do anything if we don't
        // have enough items, or the link already exists.
        var contents = ele.contents();
        if (contents.length <= maxElements || ele.find('a.morelink').length > 0) {
            return;
        }
        contents.slice(maxElements).wrapAll('<div class="hide"/>');
        ele.append('<br class="morelink-spacer"/><a class="morelink" href="#">Show More…</a>');

        // add link and wire it up to show the hidden items
        ele.find('a.morelink').click(function(event) {
            event.preventDefault();
            $(this).remove();
            ele.find('br.morelink-spacer').remove();
            // move the div contents back and delete the empty div
            var hidden = ele.find('div.hide');
            hidden.contents().appendTo(ele);
            hidden.remove();
        });
    });
}
