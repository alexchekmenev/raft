$(document).ready(function() {
    var count = 3;
    var leaderId = 0;

    $('#leader').html(leaderId + 1);

    var request = function(id) {
        setTimeout(function() {
            $.ajax({
                type: 'GET',
                url: 'http://localhost:900'+id+'/state',
                success: function(data) {
                    $('#output'+id).html(JSON.stringify(data));
                    request(id);
                },
                error: function() {
                    $('#output'+id).html('don\'t respond');
                    request(id);
                }
            });
        }, 100);
    };
    for(var i = 1; i <= count; i++) {
        $('#container').append('Srv'+i+'.state = <textarea id="output'+i+'"></textarea><br>');
        request(i);
    }

    var send = function (data) {
        $('#status').html('storing...');
        var f = 0;
        $.ajax({
            type: 'POST',
            url: 'http://localhost:900'+(leaderId + 1)+'/rpc/',
            data: data,
            success: function(data) {
                $('#status').html('majority applied changes');
            },
            error: function(a, b, c) {
                var response = a.responseJSON;
                if (response == null) {
                    leaderId = (leaderId + 1) % count;
                } else {
                    leaderId = response.leaderId;
                    f++;
                    if (f < count + 1)
                        send(data);
                }
                $('#leader').html(leaderId + 1);

            }
        });
    };

    $('#send-form').on('submit', function(e) {
        var args = $(this).serializeArray();
        var data = {};
        args.forEach(function(o) {
            data[o.name] = o.value;
        });
        send(data);
        e.preventDefault();
    });
    send({});
});